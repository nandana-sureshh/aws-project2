output "frontend_launch_template_id" {
  description = "Frontend launch template ID"
  value       = aws_launch_template.frontend.id
}

output "frontend_launch_template_version" {
  description = "Frontend launch template latest version number"
  value       = aws_launch_template.frontend.latest_version
}

output "backend_launch_template_id" {
  description = "Backend launch template ID"
  value       = aws_launch_template.backend.id
}

output "backend_launch_template_version" {
  description = "Backend launch template latest version number"
  value       = aws_launch_template.backend.latest_version
}
