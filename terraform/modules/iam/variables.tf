variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment (dev / staging / prod)"
  type        = string
}

variable "secret_arn" {
  description = "ARN of the Secrets Manager secret the backend role may read"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 documents bucket"
  type        = string
}

variable "kms_key_arn" {
  description = "ARN of the KMS CMK (used by Secrets Manager and S3)"
  type        = string
}

variable "aws_account_id" {
  description = "AWS Account ID — used to construct CloudWatch Log Group ARNs"
  type        = string
}

variable "aws_region" {
  description = "AWS region — used to construct CloudWatch Log Group ARNs"
  type        = string
}
