# CareSync — Deployment & Verification Checklist

This guide outlines the end-to-end verification process for the CareSync platform on EKS, inspired by production-grade reliability practices.

## 1. Infrastructure Verification (AWS & Terraform)

Run these checks after executing \`deploy.sh\`.

| Check | Command | Expected Result |
|-------|---------|----------|
| Cluster Status | \`aws eks describe-cluster --name caresync-dev --query 'cluster.status'\` | \`"ACTIVE"\` |
| Node Readiness | \`kubectl get nodes\` | 2+ \`Ready\` nodes |
| IRSA Roles | \`aws iam list-roles --query "Roles[?starts_with(RoleName, 'caresync-dev')].[RoleName]" --output table\` | \`albc-role\`, \`eso-role\`, \`ai-service-role\`, \`doc-service-role\` |
| ECR Repos | \`aws ecr describe-repositories --query 'repositories[*].repositoryName' --output table\` | 7 repos (auth, user, appointment, document, notification, ai, frontend) |

## 2. Kubernetes & Network Verification

```bash
# Ensure the AWS Load Balancer Controller is running
kubectl get pods -n kube-system | grep aws-load-balancer-controller

# Check Envoy Gateway status
kubectl get gateway caresync-gateway -n caresync-dev

# Wait for ALB to provision and get the DNS name
ALB_DNS=$(kubectl get ingress -n caresync-dev envoy-alb-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "ALB DNS: \${ALB_DNS}"

# Test ALB Reachability
curl -I "http://\${ALB_DNS}"
# Expected: HTTP/1.1 200 OK
```

## 3. Application End-to-End Verification

Once the ALB is routing traffic to the frontend and API services, test the critical flows.

### API Health Checks
```bash
# Frontend
curl -I "http://\${ALB_DNS}/"

# Document Service
curl "http://\${ALB_DNS}/api/documents/health"

# AI Service (Internal ClusterIP check via a pod)
kubectl exec -n caresync-dev deploy/ai-service -- wget -qO- http://localhost:3006/api/health
```

### Authentication Flow
```bash
curl -X POST "http://\${ALB_DNS}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@caresync.com","password":"adminpassword"}'
# Save the returned JWT token to a variable:
# TOKEN="eyJhbGciOiJIUzI1..."
```

### Document Upload & S3 Pre-Signed URLs
```bash
# 1. Request pre-signed URL
curl -X POST "http://\${ALB_DNS}/api/documents/presigned-url" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"originalName":"medical-report.pdf","mimeType":"application/pdf"}'

# 2. Extract the \`url\` from the response and upload directly to S3
curl -X PUT -T medical-report.pdf "<PRE_SIGNED_URL>" -H "Content-Type: application/pdf"

# 3. Confirm the upload
curl -X POST "http://\${ALB_DNS}/api/documents/confirm-upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"...","filename":"...","originalName":"medical-report.pdf","mimeType":"application/pdf","size":12345}'
```

### AI Summarization (SQS & Bedrock)
```bash
# Check ai-service logs to confirm SQS polled the document ID
kubectl logs -n caresync-dev deploy/ai-service --tail=50 | grep -i "sqs"
# Expected: [ai-service] Starting SQS Worker loop... 

# Check ai-service logs for Bedrock invocation
kubectl logs -n caresync-dev deploy/ai-service --tail=50 | grep -i "bedrock"
# Expected: [ai-service] Invoking AWS Bedrock model to summarize report...
# Expected: [ai-service] Bedrock summary generated successfully
```

## 4. Autoscaling Verification (HPA)

To ensure the cluster scales correctly under high load, run a load test against the frontend.

```bash
# Install hey (HTTP load generator)
# Mac: brew install hey | Linux: sudo apt install hey | Windows: choco install hey

# Send 50,000 requests with 200 concurrent workers
hey -n 50000 -c 200 "http://\${ALB_DNS}/"

# In a separate terminal, watch the HPA scale up
kubectl get hpa -n caresync-dev -w
```
**Expected Scale-Out Behavior:** 
When CPU target hits >70%, \`REPLICAS\` will increase from 2 towards 10. Once load testing stops, pods will gradually terminate back down to 2.

## 5. Security & Secrets Verification

```bash
# Ensure External Secrets pulled successfully from AWS Secrets Manager
kubectl get externalsecret -n caresync-dev
# Expected STATUS: SecretSynced

# Describe the synced secret to verify data population
kubectl describe secret caresync-app-secrets -n caresync-dev
```
