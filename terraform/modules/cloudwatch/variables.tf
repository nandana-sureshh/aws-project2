variable "project_name" {
  description = "Project name (used as a prefix for all resource names)"
  type        = string
}

variable "environment" {
  description = "Environment (dev / staging / prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "kms_key_arn" {
  description = "ARN of the project KMS CMK — used to encrypt log groups"
  type        = string
}

variable "backend_asg_name" {
  description = "Backend Auto Scaling Group name — used as EC2 CPU alarm dimension"
  type        = string
}

variable "rds_identifier" {
  description = "RDS instance identifier — used as RDS CPU alarm dimension"
  type        = string
}

variable "external_alb_arn_suffix" {
  description = "External ALB ARN suffix — used as ALB alarm dimension"
  type        = string
}

variable "backend_tg_arn_suffix" {
  description = "Backend target group ARN suffix — used as unhealthy hosts alarm dimension"
  type        = string
}

variable "alarm_actions" {
  description = "List of ARNs to notify when an alarm fires (empty in Phase 1, SNS ARN in Phase 2)"
  type        = list(string)
  default     = []
}

variable "log_retention_days_app" {
  description = "Retention in days for the backend application log group"
  type        = number
  default     = 30
}

variable "log_retention_days_init" {
  description = "Retention in days for the backend init log group"
  type        = number
  default     = 14
}

variable "log_retention_days_lambda" {
  description = "Retention in days for Lambda function log groups"
  type        = number
  default     = 30
}
