resource "aws_secretsmanager_secret" "app" {
  name        = "caresync/app-secrets-${random_id.id.hex}"
  kms_key_id  = var.kms_key_arn
}
resource "random_id" "id" { byte_length = 4 }

resource "random_password" "jwt_secret" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "jwt_refresh_secret" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret_version" "initial" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    DATABASE_URL       = var.database_url
    JWT_SECRET         = random_password.jwt_secret.result
    JWT_REFRESH_SECRET = random_password.jwt_refresh_secret.result
    SQS_QUEUE_URL      = var.sqs_queue_url
    S3_BUCKET_NAME     = var.s3_bucket_name
    BEDROCK_MODEL_ID   = "amazon.nova-lite-v1:0"
    AWS_REGION         = "us-east-1"
    SES_FROM_EMAIL     = var.ses_from_email
    FRONTEND_URL       = var.frontend_url
    API_BASE_URL       = var.api_base_url
    NOTIFICATION_EMAIL = var.notification_email
    CORS_ORIGIN        = var.frontend_url
    STORAGE_PROVIDER   = "s3"
    QUEUE_PROVIDER     = "sqs"
  })
}