variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
}

# ---- Networking ----

variable "vpc_id" {
  description = "VPC ID — Lambda runs inside the VPC to reach RDS"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private backend subnet IDs — Lambda placed in these subnets"
  type        = list(string)
}

variable "backend_sg_id" {
  description = "Backend security group ID — allows outbound to RDS on 5432"
  type        = string
}

variable "database_sg_id" {
  description = "Database security group ID — used to create Lambda-specific inbound rule"
  type        = string
}

# ---- Secrets / KMS ----

variable "secret_arn" {
  description = "ARN of the Secrets Manager secret containing DATABASE_URL"
  type        = string
}

variable "secret_name" {
  description = "Name of the Secrets Manager secret (passed as env var to Lambda)"
  type        = string
}

variable "kms_key_arn" {
  description = "ARN of the project CMK — used to decrypt secrets and encrypt log groups"
  type        = string
}

# ---- SNS ----

variable "sns_topic_arn" {
  description = "ARN of the alerts SNS topic — reminder Lambda publishes appointment reminders here"
  type        = string
}

# ---- Log Groups ----

variable "reminder_log_group_name" {
  description = "CloudWatch log group name for the appointment reminder Lambda"
  type        = string
}

variable "cleanup_log_group_name" {
  description = "CloudWatch log group name for the notification cleanup Lambda"
  type        = string
}

# ---- Business Logic ----

variable "reminder_window_hours" {
  description = "Reminder Lambda: send reminders for appointments within this many hours"
  type        = number
  default     = 24
}

variable "notification_retention_days" {
  description = "Cleanup Lambda: delete notifications older than this many days"
  type        = number
  default     = 30
}

# ---- Scheduling ----

variable "reminder_schedule" {
  description = "EventBridge Scheduler cron expression for appointment reminders (UTC)"
  type        = string
  default     = "cron(0 8 * * ? *)"  # 08:00 UTC daily
}

variable "cleanup_schedule" {
  description = "EventBridge Scheduler cron expression for notification cleanup (UTC)"
  type        = string
  default     = "cron(0 2 * * ? *)"  # 02:00 UTC daily
}
