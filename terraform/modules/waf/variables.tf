variable "project_name" {
  description = "Project name — used as a prefix for resource names and tags"
  type        = string
}

variable "environment" {
  description = "Environment name (dev / staging / prod)"
  type        = string
}
