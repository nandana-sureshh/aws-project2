output "backend_app_log_group_name" {
  description = "Name of the backend application log group"
  value       = aws_cloudwatch_log_group.backend_app.name
}

output "backend_app_log_group_arn" {
  description = "ARN of the backend application log group (used in IAM policy)"
  value       = aws_cloudwatch_log_group.backend_app.arn
}

output "backend_init_log_group_name" {
  description = "Name of the backend init log group"
  value       = aws_cloudwatch_log_group.backend_init.name
}

output "backend_init_log_group_arn" {
  description = "ARN of the backend init log group (used in IAM policy)"
  value       = aws_cloudwatch_log_group.backend_init.arn
}

output "dashboard_name" {
  description = "Name of the CareSync CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.caresync.dashboard_name
}
