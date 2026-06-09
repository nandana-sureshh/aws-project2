variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment (dev / staging / prod)"
  type        = string
}

variable "aws_account_id" {
  description = "AWS Account ID — used in the KMS key policy root principal"
  type        = string
}

variable "aws_region" {
  description = "AWS region — used in the CloudWatch Logs service principal endpoint"
  type        = string
}
