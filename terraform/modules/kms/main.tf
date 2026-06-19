data "aws_caller_identity" "current" {}
resource "aws_kms_key" "main" {
  description             = "CareSync Main CMK"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions",
        Effect = "Allow",
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" },
        Action = "kms:*",
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs",
        Effect = "Allow",
        Principal = { Service = "logs.amazonaws.com" },
        Action = ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"],
        Resource = "*"
      }
    ]
  })
}
resource "aws_kms_alias" "main" {
  name          = "alias/caresync-main"
  target_key_id = aws_kms_key.main.key_id
}