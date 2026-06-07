variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment (dev / staging / prod)"
  type        = string
}

variable "key_name" {
  description = "EC2 Key Pair name for SSH"
  type        = string
}

variable "aws_region" {
  description = "AWS region for SDK calls"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 documents bucket"
  type        = string
}

variable "secret_name" {
  description = "Secrets Manager secret name"
  type        = string
}

variable "frontend_sg_id" {
  description = "Security group ID for frontend EC2 instances"
  type        = string
}

variable "backend_sg_id" {
  description = "Security group ID for backend EC2 instances"
  type        = string
}

variable "backend_instance_profile_name" {
  description = "IAM instance profile name for backend EC2 instances"
  type        = string
}

variable "github_repo_url" {
  description = "GitHub repository HTTPS URL"
  type        = string
  default     = "https://github.com/nandana-sureshh/monolithic-application-v1.git"
}
