output "backend_instance_profile_name" {
  description = "IAM instance profile name for backend EC2 instances"
  value       = aws_iam_instance_profile.backend.name
}

output "backend_instance_profile_arn" {
  description = "IAM instance profile ARN for backend EC2 instances"
  value       = aws_iam_instance_profile.backend.arn
}

output "backend_role_name" {
  description = "IAM role name for backend EC2 instances"
  value       = aws_iam_role.backend.name
}

output "backend_role_arn" {
  description = "IAM role ARN for backend EC2 instances"
  value       = aws_iam_role.backend.arn
}
