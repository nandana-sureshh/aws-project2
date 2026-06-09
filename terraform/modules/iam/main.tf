# --- Backend EC2 IAM Role ---

resource "aws_iam_role" "backend" {
  name        = "${var.project_name}-${var.environment}-backend-role"
  description = "IAM role for CareSync backend EC2 instances"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEC2AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-backend-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

# --- Secrets Manager: read the application secret ---

resource "aws_iam_role_policy" "secrets_manager_access" {
  name = "${var.project_name}-${var.environment}-secrets-access"
  role = aws_iam_role.backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadApplicationSecret"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.secret_arn
      }
    ]
  })
}

# --- S3: document CRUD on the documents bucket ---

resource "aws_iam_role_policy" "s3_access" {
  name = "${var.project_name}-${var.environment}-s3-access"
  role = aws_iam_role.backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3ObjectOperations"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:HeadObject"
        ]
        Resource = "${var.s3_bucket_arn}/*"
      },
      {
        Sid    = "S3BucketOperations"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = var.s3_bucket_arn
      }
    ]
  })
}

# --- KMS: decrypt secrets and generate data keys for S3 SSE-KMS uploads ---
# GenerateDataKey* covers both GenerateDataKey and GenerateDataKeyWithoutPlaintext
# (the latter is used by the S3 pre-signer and SSE-KMS upload path)

resource "aws_iam_role_policy" "kms_access" {
  name = "${var.project_name}-${var.environment}-kms-access"
  role = aws_iam_role.backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KMSForSecretsAndS3"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = var.kms_key_arn
      }
    ]
  })
}

# --- CloudWatch Logs: write to backend log groups from EC2 instance ---
#
# Used by two shipping mechanisms:
#   1. Docker awslogs driver  → /backend/app  log group
#   2. CloudWatch Agent       → /backend/init log group
#
# Resource is scoped to the two specific log group ARNs — no wildcards.
# The trailing :* is required to allow CreateLogStream and PutLogEvents
# on log streams within those groups.

resource "aws_iam_role_policy" "cloudwatch_logs_access" {
  name = "${var.project_name}-${var.environment}-cw-logs-access"
  role = aws_iam_role.backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "WriteBackendLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "logs:DescribeLogGroups"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:/${var.project_name}/${var.environment}/backend/app:*",
          "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:/${var.project_name}/${var.environment}/backend/init:*"
        ]
      }
    ]
  })
}

# --- Instance Profile (wraps role for EC2 use) ---

resource "aws_iam_instance_profile" "backend" {
  name = "${var.project_name}-${var.environment}-backend-profile"
  role = aws_iam_role.backend.name

  tags = {
    Name        = "${var.project_name}-${var.environment}-backend-profile"
    Environment = var.environment
    Project     = var.project_name
  }
}
