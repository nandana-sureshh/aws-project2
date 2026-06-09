# --- Customer Managed KMS Key ---
# Single CMK shared by RDS, Secrets Manager, and S3.
# Key policy grants:
#   1. Root account — full control (prevents lock-out)
#   2. AWS services (secretsmanager, rds) via service principal — service-side encryption
#
# NOTE: EC2 IAM role access to KMS is granted via the IAM role policy
#       (modules/iam), NOT here. That keeps this key policy minimal.

resource "aws_kms_key" "caresync" {
  description             = "${var.project_name} ${var.environment} Customer Managed Key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Root account retains full control — prevents accidental lock-out
        Sid    = "EnableRootAccountFullControl"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.aws_account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        # Allow Secrets Manager service to use this key for envelope encryption
        Sid    = "AllowSecretsManagerEncryption"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        # Allow RDS service to use this key for storage encryption
        Sid    = "AllowRDSEncryption"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:CreateGrant",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        # Allow CloudWatch Logs to use this key for log group encryption.
        # The kms:EncryptionContext condition scopes permission strictly to
        # CloudWatch log resources in this AWS account — satisfies least-privilege
        # even though Resource = "*" is required for key policy statements.
        Sid    = "AllowCloudWatchLogsEncryption"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:*"
          }
        }
      },
      {
        # Allow SNS service to use this key for topic encryption.
        # Required so the SNS topic can use the project CMK for server-side
        # encryption of messages at rest. Scoped to SNS service principal only.
        Sid    = "AllowSNSEncryption"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-cmk"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_kms_alias" "caresync" {
  name          = "alias/${var.project_name}-${var.environment}-cmk"
  target_key_id = aws_kms_key.caresync.key_id
}
