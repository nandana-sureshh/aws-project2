variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment (dev / staging / prod)"
  type        = string
}

variable "database_subnet_ids" {
  description = "List of database subnet IDs for the RDS subnet group"
  type        = list(string)
}

variable "database_sg_id" {
  description = "Security group ID for the RDS instance"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS Key ARN for RDS storage encryption"
  type        = string
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "caresync"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "caresync_admin"
}

variable "db_password" {
  description = "RDS master password — set via terraform.tfvars or TF_VAR_db_password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}
