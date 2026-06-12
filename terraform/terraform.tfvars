# Copy to terraform.tfvars and fill in your values.
# NEVER commit terraform.tfvars — it contains sensitive values.
# It is already listed in .gitignore.

aws_region   = "us-east-1"
project_name = "caresync"
environment  = "dev"

# AWS Account ID (12-digit number, no hyphens)
# Get via: aws sts get-caller-identity --query Account --output text
aws_account_id = "664685894054"

# RDS credentials
# db_password will be stored in RDS — also needed when building DATABASE_URL
# for Secrets Manager after apply
db_username = "caresync_admin"
db_password = "Caresync2026!"

# Phase 3 — SNS alert email (gitignored, never committed)
alert_email = "nandanaluminar2@gmail.com"

# Phase 3 — Notification cleanup retention window (days)
notification_retention_days = 30
