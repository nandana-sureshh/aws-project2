resource "aws_cloudwatch_metric_alarm" "dlq_not_empty" {
  alarm_name          = "${var.cluster_name}-dlq-not-empty"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "0"
  alarm_description   = "Alarm when DLQ has messages"
  alarm_actions       = [var.sns_topic_arn]
  dimensions          = { QueueName = var.sqs_dlq_name }
}