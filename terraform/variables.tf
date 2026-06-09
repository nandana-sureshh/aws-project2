variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name (used as prefix for all resource names)"
  type        = string
  default     = "caresync"
}

variable "environment" {
  description = "Environment name (dev / staging / prod)"
  type        = string
  default     = "dev"
}

# ---------------------------------------------------------------------------
# Phase 2 required variables
# ---------------------------------------------------------------------------

variable "aws_account_id" {
  description = "AWS Account ID — used in the KMS key policy root principal"
  type        = string
  # Get via: aws sts get-caller-identity --query Account --output text
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "caresync_admin"
}

variable "db_password" {
  description = "RDS master password — sensitive, never commit to git"
  type        = string
  sensitive   = true
  # Set via: terraform.tfvars or  export TF_VAR_db_password='...'
}

# ---------------------------------------------------------------------------
# Phase 3 (SNS + Lambda) variables
# ---------------------------------------------------------------------------

variable "alert_email" {
  description = "Email address for CloudWatch alarm SNS notifications — populated from terraform.tfvars"
  type        = string
}

variable "notification_retention_days" {
  description = "Cleanup Lambda: delete notifications older than this many days"
  type        = number
  default     = 30
}