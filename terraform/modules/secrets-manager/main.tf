resource "aws_secretsmanager_secret" "app" {
  name        = "caresync/app-secrets-${random_id.id.hex}"
  kms_key_id  = var.kms_key_arn
}
resource "random_id" "id" { byte_length = 4 }
resource "aws_secretsmanager_secret_version" "initial" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    DATABASE_URL       = "REPLACE_ME_POSTGRES_URL"
    JWT_SECRET         = "REPLACE_ME_JWT"
    JWT_REFRESH_SECRET = "REPLACE_ME_REFRESH"
    SQS_QUEUE_URL      = "REPLACE_ME_SQS_URL"
    S3_BUCKET_NAME     = "REPLACE_ME_S3_BUCKET"
    BEDROCK_MODEL_ID   = "amazon.nova-lite-v1:0"
    AWS_REGION         = "us-east-1"
    SES_FROM_EMAIL     = "REPLACE_ME_SES"
    FRONTEND_URL       = "REPLACE_ME_FRONTEND"
    API_BASE_URL       = "REPLACE_ME_API_BASE"
    NOTIFICATION_EMAIL = "REPLACE_ME_NOTIF_EMAIL"
  })
}