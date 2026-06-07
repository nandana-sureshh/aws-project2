output "project_name" {
  description = "Project name"
  value       = var.project_name
}

output "environment" {
  description = "Environment"
  value       = var.environment
}

# --- ALB ---

output "external_alb_dns_name" {
  description = "External ALB DNS — the public entry point for the application"
  value       = module.alb.external_alb_dns_name
}

output "internal_alb_dns_name" {
  description = "Internal ALB DNS — for internal service-to-service use"
  value       = module.alb.internal_alb_dns_name
}

# --- RDS ---

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port)"
  value       = module.rds.db_endpoint
}

output "rds_host" {
  description = "RDS hostname (used when building DATABASE_URL for Secrets Manager)"
  value       = module.rds.db_host
}

output "rds_db_name" {
  description = "RDS database name"
  value       = module.rds.db_name
}

# --- S3 ---

output "s3_bucket_name" {
  description = "S3 documents bucket name"
  value       = module.s3.bucket_name
}

# --- KMS ---

output "kms_key_id" {
  description = "KMS Customer Managed Key ID"
  value       = module.kms.kms_key_id
}

# --- Secrets Manager ---

output "secret_name" {
  description = "Secrets Manager secret name — populate values via AWS Console after apply"
  value       = module.secrets_manager.secret_name
}

output "secret_arn" {
  description = "Secrets Manager secret ARN"
  value       = module.secrets_manager.secret_arn
}

# --- ASGs ---

output "frontend_asg_name" {
  description = "Frontend Auto Scaling Group name"
  value       = module.asg.frontend_asg_name
}

output "backend_asg_name" {
  description = "Backend Auto Scaling Group name"
  value       = module.asg.backend_asg_name
}