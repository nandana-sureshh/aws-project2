# ===========================================================================
# CareSync SNS Module
#
# Creates:
#   - 1 KMS-encrypted SNS topic for infrastructure alerts
#   - 1 email subscription (address from var.alert_email, never hardcoded)
#
# Email confirmation flow:
#   1. terraform apply creates the subscription in PENDING state
#   2. AWS sends a confirmation email to var.alert_email
#   3. Recipient clicks "Confirm subscription" in the email
#   4. Subscription becomes CONFIRMED — alarms can now deliver messages
#
# The same topic ARN is passed to:
#   - CloudWatch alarms (alarm_actions) in the cloudwatch module
#   - Lambda reminder function (to publish appointment reminders)
# ===========================================================================

resource "aws_sns_topic" "alerts" {
  name              = "${var.project_name}-${var.environment}-alerts"
  kms_master_key_id = var.kms_key_arn

  tags = {
    Name        = "${var.project_name}-${var.environment}-alerts"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Infrastructure alarms + appointment reminder notifications"
  }
}

# Email subscription — address injected from var.alert_email (terraform.tfvars)
# Subscription starts in PENDING_CONFIRMATION state.
# AWS sends a confirmation email — subscriber must click the link to activate.
resource "aws_sns_topic_subscription" "alert_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
