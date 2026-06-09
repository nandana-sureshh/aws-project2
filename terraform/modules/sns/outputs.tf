output "topic_arn" {
  description = "SNS topic ARN — passed to cloudwatch alarm_actions and Lambda environment"
  value       = aws_sns_topic.alerts.arn
}

output "topic_name" {
  description = "SNS topic name"
  value       = aws_sns_topic.alerts.name
}
