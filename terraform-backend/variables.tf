# ===========================================================================
# Terraform Bootstrap — variables.tf
# ===========================================================================

variable "aws_region" {
  description = "AWS region — must match the main CareSync Terraform project"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name — used as a prefix for all resource names"
  type        = string
  default     = "caresync"
}

variable "environment" {
  description = "Environment name — must match the main CareSync Terraform project (dev / staging / prod)"
  type        = string
  default     = "dev"
}

variable "aws_account_id" {
  description = <<-EOT
    AWS Account ID (12 digits, no hyphens).
    Used as a suffix on the S3 bucket name to guarantee global uniqueness.
    S3 bucket names are globally unique across ALL AWS accounts worldwide.
    Appending the account ID makes the name deterministically unique without
    using random UUIDs, which would break reproducibility.
    Retrieve via: aws sts get-caller-identity --query Account --output text
  EOT
  type        = string
}

variable "noncurrent_version_expiry_days" {
  description = "Number of days after which noncurrent S3 object versions are permanently deleted. Prevents unbounded storage growth from state history."
  type        = number
  default     = 90
}
