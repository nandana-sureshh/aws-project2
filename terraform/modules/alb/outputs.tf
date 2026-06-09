output "frontend_target_group_arn" {
  value = aws_lb_target_group.frontend.arn
}

output "backend_target_group_arn" {
  value = aws_lb_target_group.backend.arn
}

output "internal_backend_target_group_arn" {
  value = aws_lb_target_group.internal_backend.arn
}

output "external_alb_dns_name" {
  value = aws_lb.external.dns_name
}

output "internal_alb_dns_name" {
  value = aws_lb.internal.dns_name
}

# --- Outputs required for CloudWatch alarm dimensions ---

output "external_alb_arn_suffix" {
  description = "External ALB ARN suffix — used as CloudWatch alarm LoadBalancer dimension"
  value       = aws_lb.external.arn_suffix
}

output "backend_tg_arn_suffix" {
  description = "Backend target group ARN suffix — used as CloudWatch alarm TargetGroup dimension"
  value       = aws_lb_target_group.backend.arn_suffix
}