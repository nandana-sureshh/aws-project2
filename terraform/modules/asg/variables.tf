variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment (dev / staging / prod)"
  type        = string
}

variable "frontend_subnet_ids" {
  description = "Subnet IDs for the frontend ASG"
  type        = list(string)
}

variable "backend_subnet_ids" {
  description = "Subnet IDs for the backend ASG"
  type        = list(string)
}

variable "frontend_launch_template_id" {
  description = "Frontend launch template ID"
  type        = string
}

variable "frontend_launch_template_version" {
  description = "Frontend launch template version"
  type        = string
}

variable "backend_launch_template_id" {
  description = "Backend launch template ID"
  type        = string
}

variable "backend_launch_template_version" {
  description = "Backend launch template version"
  type        = string
}

variable "frontend_target_group_arn" {
  description = "ARN of the frontend ALB target group"
  type        = string
}

variable "backend_target_group_arn" {
  description = "ARN of the backend ALB target group"
  type        = string
}

variable "internal_backend_target_group_arn" {
  description = "ARN of the internal backend ALB target group"
  type        = string
}
