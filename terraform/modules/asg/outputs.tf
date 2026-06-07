output "frontend_asg_name" {
  description = "Frontend Auto Scaling Group name"
  value       = aws_autoscaling_group.frontend.name
}

output "backend_asg_name" {
  description = "Backend Auto Scaling Group name"
  value       = aws_autoscaling_group.backend.name
}
