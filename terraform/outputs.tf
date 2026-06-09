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

# --- CloudWatch ---

output "cloudwatch_backend_app_log_group" {
  description = "CloudWatch log group for backend container stdout/stderr (Docker awslogs driver)"
  value       = module.cloudwatch.backend_app_log_group_name
}

output "cloudwatch_backend_init_log_group" {
  description = "CloudWatch log group for EC2 bootstrap init log (CloudWatch Agent)"
  value       = module.cloudwatch.backend_init_log_group_name
}

output "cloudwatch_dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = module.cloudwatch.dashboard_name
}

# --- SNS ---

output "sns_topic_arn" {
  description = "SNS alerts topic ARN — CloudWatch alarms and appointment reminders publish here"
  value       = module.sns.topic_arn
}

output "sns_topic_name" {
  description = "SNS alerts topic name"
  value       = module.sns.topic_name
}

# --- Lambda ---

output "lambda_reminder_name" {
  description = "Appointment reminder Lambda function name"
  value       = module.lambda.reminder_lambda_name
}

output "lambda_cleanup_name" {
  description = "Notification cleanup Lambda function name"
  value       = module.lambda.cleanup_lambda_name
}

output "lambda_security_group_id" {
  description = "Security group ID attached to both Lambda functions"
  value       = module.lambda.lambda_security_group_id
}

# --- CloudFront ---

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name — set VITE_API_URL=https://<value> and rebuild frontend"
  value       = module.cloudfront.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — use for cache invalidation: aws cloudfront create-invalidation --distribution-id <value> --paths '/*'"
  value       = module.cloudfront.cloudfront_distribution_id
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront hosted zone ID — use when adding a Route53 alias record in a future phase"
  value       = module.cloudfront.cloudfront_hosted_zone_id
}

output "cloudfront_arn" {
  description = "CloudFront distribution ARN — use when attaching a WAF WebACL in a future phase"
  value       = module.cloudfront.cloudfront_arn
}

# --- WAF ---

output "waf_web_acl_arn" {
  description = "ARN of the WAFv2 WebACL attached to CloudFront"
  value       = module.waf.web_acl_arn
}