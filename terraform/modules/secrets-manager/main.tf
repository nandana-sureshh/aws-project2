# --- CareSync Application Secret Container ---
#
# Terraform creates the secret SHELL only.
# Secret VALUES must be added manually after deployment via AWS Console or CLI.
#
# Required JSON structure (add via Console → Secrets Manager → caresync-dev-app-secrets → Edit):
# {
#   "DATABASE_URL": "postgresql://caresync_admin:PASSWORD@RDS_HOST:5432/caresync",
#   "JWT_SECRET": "min-32-char-random-string",
#   "JWT_REFRESH_SECRET": "min-32-char-random-string"
# }
#
# Quick CLI command to populate after apply:
#   aws secretsmanager put-secret-value \
#     --secret-id caresync-dev-app-secrets \
#     --secret-string '{"DATABASE_URL":"...","JWT_SECRET":"...","JWT_REFRESH_SECRET":"..."}'

resource "aws_secretsmanager_secret" "app" {
  name        = "${var.project_name}-${var.environment}-app-secrets"
  description = "CareSync backend secrets: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET"

  kms_key_id = var.kms_key_arn

  # Zero recovery window — allows clean destroy/re-apply during development.
  # Change to 7 for staging/production.
  recovery_window_in_days = 0

  tags = {
    Name        = "${var.project_name}-${var.environment}-app-secrets"
    Environment = var.environment
    Project     = var.project_name
  }
}
