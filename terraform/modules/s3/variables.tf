variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment (dev / staging / prod)"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS Key ARN for S3 SSE-KMS encryption"
  type        = string
}
