variable "project_name" {
  description = "Project name — used as a prefix for resource names and tags"
  type        = string
}

variable "environment" {
  description = "Environment name (dev / staging / prod)"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the External ALB — used as the CloudFront origin domain"
  type        = string
}

variable "web_acl_arn" {
  description = "ARN of the WAFv2 WebACL to associate with CloudFront"
  type        = string
  default     = null
}
