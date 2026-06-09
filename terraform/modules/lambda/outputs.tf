output "reminder_lambda_arn" {
  description = "ARN of the appointment-reminder Lambda function"
  value       = aws_lambda_function.appointment_reminder.arn
}

output "reminder_lambda_name" {
  description = "Name of the appointment-reminder Lambda function"
  value       = aws_lambda_function.appointment_reminder.function_name
}

output "cleanup_lambda_arn" {
  description = "ARN of the notification-cleanup Lambda function"
  value       = aws_lambda_function.notification_cleanup.arn
}

output "cleanup_lambda_name" {
  description = "Name of the notification-cleanup Lambda function"
  value       = aws_lambda_function.notification_cleanup.function_name
}

output "lambda_security_group_id" {
  description = "ID of the Lambda security group"
  value       = aws_security_group.lambda.id
}
