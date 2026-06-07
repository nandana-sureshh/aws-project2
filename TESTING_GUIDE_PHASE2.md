# CareSync Phase 2 — Testing Guide

## What Was Implemented

| Component | Description |
|-----------|-------------|
| KMS | Customer Managed Key for RDS, Secrets Manager, S3 |
| Secrets Manager | Secret container for DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET |
| IAM | Backend EC2 role + instance profile (Secrets Manager, S3, KMS) |
| RDS | PostgreSQL 16, db.t3.micro, KMS-encrypted, database subnets |
| S3 | Document storage bucket, SSE-KMS, versioning, public access blocked |
| Launch Templates | Frontend (t3.micro) + Backend (t3.micro), retry logic, separate compose |
| ASGs | Frontend ASG (min=1/des=1/max=2) + Backend ASG (min=1/des=1/max=2) |
| ALB Routing | External ALB: `/api/*` → Backend TG, `/*` → Frontend TG |

---

## Prerequisites

- AWS CLI configured with sufficient permissions
- Terraform ≥ 1.5.0 installed
- SSH key pair `kubernetes-project` available locally

---

## Part 1: Terraform Deployment

### 1.1 Create terraform.tfvars

```bash
cd monolithic-application-v1/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
aws_region     = "us-east-1"
project_name   = "caresync"
environment    = "dev"
aws_account_id = "YOUR_12_DIGIT_ACCOUNT_ID"  # aws sts get-caller-identity --query Account --output text
db_username    = "caresync_admin"
db_password    = "YourStrongPassword123!"
```

### 1.2 Terraform Init

```bash
terraform init
```

**Expected:** `Terraform has been successfully initialized!`

### 1.3 Terraform Format Check

```bash
terraform fmt -recursive -check
```

**Expected:** No output (all files already formatted). If files are listed, run `terraform fmt -recursive`.

### 1.4 Terraform Validate

```bash
terraform validate
```

**Expected:**
```
Success! The configuration is valid.
```

### 1.5 Terraform Plan

```bash
terraform plan -out=plan.out
```

**Expected output includes:**
- `module.kms.aws_kms_key.caresync` — will be created
- `module.secrets_manager.aws_secretsmanager_secret.app` — will be created
- `module.iam.aws_iam_role.backend` — will be created
- `module.rds.aws_db_instance.postgres` — will be created
- `module.s3.aws_s3_bucket.documents` — will be created
- `module.launch_templates.aws_launch_template.frontend` — will be created
- `module.launch_templates.aws_launch_template.backend` — will be created
- `module.asg.aws_autoscaling_group.frontend` — will be created
- `module.asg.aws_autoscaling_group.backend` — will be created
- `module.alb.aws_lb_listener_rule.api_to_backend` — will be created
- `Plan: XX to add, 0 to change, 0 to destroy`

> ⚠️ **IMPORTANT**: Verify the plan shows `0 to destroy`. Phase 1 resources must not be destroyed.

### 1.6 Terraform Apply

```bash
terraform apply plan.out
```

**⏱ RDS takes 10–15 minutes to provision. Be patient.**

**Expected:**
```
Apply complete! Resources: XX added, 0 changed, 0 destroyed.

Outputs:
external_alb_dns_name = "caresync-external-alb-XXXX.us-east-1.elb.amazonaws.com"
rds_host              = "caresync-dev-postgres.XXXX.us-east-1.rds.amazonaws.com"
s3_bucket_name        = "caresync-dev-documents"
secret_name           = "caresync-dev-app-secrets"
...
```

---

## Part 2: Post-Apply Required Steps (Do This Before Testing Application)

### 2.1 Populate Secrets Manager (REQUIRED)

The secret container exists but is empty. The application will fail to start until you add values.

**Step 1:** Get the RDS host from Terraform output:
```bash
terraform output rds_host
```

**Step 2:** Populate the secret via AWS CLI:
```bash
SECRET_NAME=$(terraform output -raw secret_name)
RDS_HOST=$(terraform output -raw rds_host)
DB_PASS="YourStrongPassword123!"   # same as db_password in terraform.tfvars

aws secretsmanager put-secret-value \
  --secret-id "$SECRET_NAME" \
  --secret-string "{
    \"DATABASE_URL\": \"postgresql://caresync_admin:${DB_PASS}@${RDS_HOST}:5432/caresync\",
    \"JWT_SECRET\": \"$(openssl rand -base64 48 | tr -d '\n')\",
    \"JWT_REFRESH_SECRET\": \"$(openssl rand -base64 48 | tr -d '\n')\"
  }"
```

**Verify:**
```bash
aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --query SecretString --output text
```

**Expected:** JSON with all three keys populated.

### 2.2 Refresh ASG Instances

After populating secrets, trigger a rolling refresh so EC2 instances pick up the populated secret:

```bash
BACKEND_ASG=$(terraform output -raw backend_asg_name)
FRONTEND_ASG=$(terraform output -raw frontend_asg_name)

aws autoscaling start-instance-refresh \
  --auto-scaling-group-name "$BACKEND_ASG" \
  --preferences '{"MinHealthyPercentage": 50}'

aws autoscaling start-instance-refresh \
  --auto-scaling-group-name "$FRONTEND_ASG" \
  --preferences '{"MinHealthyPercentage": 50}'
```

**Check refresh status:**
```bash
aws autoscaling describe-instance-refreshes \
  --auto-scaling-group-name "$BACKEND_ASG" \
  --query 'InstanceRefreshes[0].{Status:Status,PercentageComplete:PercentageComplete}'
```

**Wait until:** `Status: Successful`

---

## Part 3: Infrastructure Validation

### 3.1 KMS

```bash
KMS_KEY_ID=$(terraform output -raw kms_key_id)
aws kms describe-key --key-id "$KMS_KEY_ID" \
  --query 'KeyMetadata.{State:KeyState,Rotation:KeyRotationStatus}'
```

**Expected:** `State: Enabled`, `Rotation: true`

### 3.2 Secrets Manager

```bash
SECRET_NAME=$(terraform output -raw secret_name)
aws secretsmanager describe-secret --secret-id "$SECRET_NAME" \
  --query '{Name:Name,KMSKey:KmsKeyId}'
```

**Expected:** Name matches, KMSKey contains CMK ARN (not default aws/secretsmanager)

### 3.3 IAM Instance Profile

```bash
aws iam get-instance-profile \
  --instance-profile-name caresync-dev-backend-profile \
  --query 'InstanceProfile.Roles[0].RoleName'
```

**Expected:** `caresync-dev-backend-role`

```bash
aws iam list-role-policies --role-name caresync-dev-backend-role \
  --query 'PolicyNames'
```

**Expected:** Three inline policies: `caresync-dev-secrets-access`, `caresync-dev-s3-access`, `caresync-dev-kms-access`

### 3.4 RDS

```bash
aws rds describe-db-instances \
  --db-instance-identifier caresync-dev-postgres \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Encrypted:StorageEncrypted,PubliclyAccessible:PubliclyAccessible}'
```

**Expected:** `Status: available`, `Encrypted: true`, `PubliclyAccessible: false`

### 3.5 S3 Bucket

```bash
BUCKET=$(terraform output -raw s3_bucket_name)

# Encryption
aws s3api get-bucket-encryption --bucket "$BUCKET" \
  --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm'
# Expected: "aws:kms"

# Public access block
aws s3api get-public-access-block --bucket "$BUCKET"
# Expected: all 4 fields = true
```

### 3.6 ALB Path-Based Routing

```bash
EXTERNAL_ALB=$(terraform output -raw external_alb_dns_name)

# Test frontend (default route)
curl -I "http://$EXTERNAL_ALB/"
# Expected: HTTP/1.1 200 OK (or 302 redirect to /login)

# Test API route (path-based routing /api/*)
curl -I "http://$EXTERNAL_ALB/api/health"
# Expected: HTTP/1.1 200 OK with JSON body
```

---

## Part 4: Application Validation

### 4.1 Check EC2 Bootstrap Logs

SSH to bastion first:
```bash
ssh -i ~/.ssh/kubernetes-project.pem ubuntu@<BASTION_PUBLIC_IP>
```

Get backend instance private IP:
```bash
aws ec2 describe-instances \
  --filters "Name=tag:Role,Values=backend" "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].PrivateIpAddress' --output text
```

SSH to backend via bastion (ProxyJump):
```bash
ssh -o ProxyJump=ubuntu@<BASTION_IP> ubuntu@<BACKEND_PRIVATE_IP>
```

Check bootstrap log:
```bash
cat /var/log/caresync-backend-init.log
```

**Expected last line:** `=== CareSync Backend Bootstrap Complete: <date> ===`

Check container:
```bash
docker ps
docker logs caresync-backend --tail 100
```

**Expected in logs:**
```
🔐 Fetching secrets from AWS Secrets Manager: caresync-dev-app-secrets (us-east-1)
✅ Secrets loaded from AWS Secrets Manager
✅ Database connected
🚀 CareSync API running at http://0.0.0.0:3000
```

### 4.2 Health Check

```bash
EXTERNAL_ALB=$(terraform output -raw external_alb_dns_name)
curl -f "http://$EXTERNAL_ALB/api/health"
```

**Expected:**
```json
{"status":"healthy","timestamp":"2026-..."}
```

### 4.3 Full Registration Flow

```bash
EXTERNAL_ALB=$(terraform output -raw external_alb_dns_name)

# Register a patient
curl -s -X POST "http://$EXTERNAL_ALB/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "PATIENT"
  }' | python3 -m json.tool
```

**Expected:** `201 Created` with `{ data: { user: {...}, accessToken: "..." } }`

### 4.4 Document Upload to S3

```bash
# Login and get token
TOKEN=$(curl -s -X POST "http://$EXTERNAL_ALB/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['accessToken'])")

echo "Token: ${TOKEN:0:20}..."

# Create a test file
echo "CareSync test document content" > /tmp/test-doc.txt

# Upload
curl -s -X POST "http://$EXTERNAL_ALB/api/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-doc.txt" \
  | python3 -m json.tool
```

**Expected:** `201 Created` with document ID and `storageKey`

**Verify file is in S3:**
```bash
BUCKET=$(terraform output -raw s3_bucket_name)
aws s3 ls "s3://$BUCKET/" --recursive
```

**Expected:** File appears under `documents/` prefix

### 4.5 Document Download from S3

```bash
DOC_ID="<document-id-from-upload-response>"
curl -f "http://$EXTERNAL_ALB/api/documents/$DOC_ID/download" \
  -H "Authorization: Bearer $TOKEN" \
  --output /tmp/downloaded.txt

cat /tmp/downloaded.txt
```

**Expected:** `CareSync test document content`

---

## Part 5: Troubleshooting

### Terraform Issues

**`Error: db_password variable not set`**
```bash
# Add to terraform.tfvars:
db_password = "YourStrongPassword123!"
# Or: export TF_VAR_db_password="YourStrongPassword123!"
```

**`Error: aws_account_id variable not set`**
```bash
aws sts get-caller-identity --query Account --output text
# Add the result to terraform.tfvars as aws_account_id
```

**`Error: RDS engine version 16.X not available`**
- The module uses `engine_version = "16"` which AWS resolves to the latest available patch. This should not occur.

---

### Application Issues

**Backend log: `Failed to retrieve secrets from Secrets Manager`**
1. Check instance profile is attached: `docker inspect caresync-backend | grep -i iam`
2. Test from the EC2 instance: `aws secretsmanager get-secret-value --secret-id caresync-dev-app-secrets`
3. If AccessDeniedException: the IAM role policy didn't attach correctly. Check `terraform apply` completed without errors.

**Backend log: `Secret has no value`**
- Run the `aws secretsmanager put-secret-value` command from Part 2.1

**Backend log: `Can't reach database server`**
1. Verify DATABASE_URL in secret has correct RDS host: `terraform output rds_host`
2. Check RDS is available: `aws rds describe-db-instances --db-instance-identifier caresync-dev-postgres --query 'DBInstances[0].DBInstanceStatus'`
3. Verify database security group allows port 5432 from backend SG

**ALB health check fails, instances keep replacing**
1. Check `health_check_grace_period = 600` — ASG waits 10 min before checking
2. Check bootstrap log: `cat /var/log/caresync-backend-init.log`
3. If log ends early: a command failed. The script uses `set -uo pipefail` without `-e`, so it continues on errors. Look for `FATAL:` lines.
4. Check docker containers: `docker ps -a` — if container exited, `docker logs caresync-backend`

**Frontend 502 Bad Gateway on /api/ requests**
- External ALB listener rule for `/api/*` targets backend instances
- Check backend instances are healthy in the target group:
  ```bash
  aws elbv2 describe-target-health \
    --target-group-arn $(aws elbv2 describe-target-groups \
      --names caresync-backend-tg \
      --query 'TargetGroups[0].TargetGroupArn' --output text)
  ```

**S3 `AccessDenied` on upload**
1. Verify `kms:GenerateDataKey*` (with wildcard) is in the KMS policy
2. Verify `STORAGE_PROVIDER=s3` in the `.env.aws` file on EC2
3. Verify `S3_BUCKET_NAME` matches actual bucket: `terraform output s3_bucket_name`

---

## Part 6: Deployment Steps Summary

```bash
# Step 1: Create tfvars
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your real values

# Step 2: Init + validate
terraform init
terraform fmt -recursive
terraform validate

# Step 3: Plan + apply
terraform plan -out=plan.out
terraform apply plan.out
# Wait ~15 minutes for RDS

# Step 4: Populate secrets (REQUIRED)
# Follow Part 2.1 above

# Step 5: Refresh instances
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name $(terraform output -raw backend_asg_name) \
  --preferences '{"MinHealthyPercentage":50}'

# Step 6: Wait for instances to be healthy (~10 min)
# Step 7: Test
EXTERNAL_ALB=$(terraform output -raw external_alb_dns_name)
curl "http://$EXTERNAL_ALB/"
curl "http://$EXTERNAL_ALB/api/health"

echo "✅ CareSync is live at http://$EXTERNAL_ALB"
```

---

## Part 7: Teardown

```bash
cd terraform
terraform destroy
# Type 'yes' when prompted
```

> Note: `skip_final_snapshot = true` and `deletion_protection = false` are set for dev.
> Change both for staging/production.
