variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment"
  type        = string
}

variable "kms_key_arn" {
  description = "ARN of the project CMK — used to encrypt the SNS topic at rest"
  type        = string
}

variable "alert_email" {
  description = "Email address for infrastructure alert subscriptions — never hardcoded in resources"
  type        = string
}
