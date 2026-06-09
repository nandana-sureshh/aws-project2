# ===========================================================================
# CareSync CloudWatch Module
#
# Creates:
#   - 2 KMS-encrypted Log Groups (app container logs + EC2 init logs)
#   - 4 CloudWatch Metric Alarms (backend unhealthy, EC2 CPU, RDS CPU, ALB 5XX)
#   - 1 CloudWatch Dashboard with 7 widgets
#
# Log shipping is handled externally:
#   - /backend/app  → Docker awslogs driver in docker-compose.backend.yml
#   - /backend/init → CloudWatch Agent configured in EC2 user data
#
# alarm_actions = [] in Phase 1; SNS ARN wired in Phase 2.
# ===========================================================================

# ---------------------------------------------------------------------------
# Log Groups
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "backend_app" {
  name              = "/${var.project_name}/${var.environment}/backend/app"
  retention_in_days = var.log_retention_days_app
  kms_key_id        = var.kms_key_arn

  tags = {
    Name        = "${var.project_name}-${var.environment}-backend-app-logs"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Container stdout/stderr via Docker awslogs driver"
  }
}

resource "aws_cloudwatch_log_group" "backend_init" {
  name              = "/${var.project_name}/${var.environment}/backend/init"
  retention_in_days = var.log_retention_days_init
  kms_key_id        = var.kms_key_arn

  tags = {
    Name        = "${var.project_name}-${var.environment}-backend-init-logs"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "EC2 bootstrap init log via CloudWatch Agent"
  }
}

# ---------------------------------------------------------------------------
# Lambda Function Log Groups (Phase 3)
# AWS Lambda writes to /aws/lambda/<function-name> by default.
# Creating them explicitly here ensures KMS encryption and retention are
# applied before the Lambda function runs for the first time.
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "lambda_reminder" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-appointment-reminder"
  retention_in_days = var.log_retention_days_lambda
  kms_key_id        = var.kms_key_arn

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-reminder-logs"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Appointment reminder Lambda function logs"
  }
}

resource "aws_cloudwatch_log_group" "lambda_cleanup" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-notification-cleanup"
  retention_in_days = var.log_retention_days_lambda
  kms_key_id        = var.kms_key_arn

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-cleanup-logs"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Notification cleanup Lambda function logs"
  }
}


# ---------------------------------------------------------------------------
# CloudWatch Metric Alarms
# ---------------------------------------------------------------------------

# Alarm 1: Backend unhealthy host count > 0 for 2 consecutive minutes
# Fires when the ALB health check reports at least one backend instance unhealthy.
resource "aws_cloudwatch_metric_alarm" "backend_unhealthy_hosts" {
  alarm_name          = "${var.project_name}-${var.environment}-backend-unhealthy-hosts"
  alarm_description   = "One or more backend instances are failing ALB health checks"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.external_alb_arn_suffix
    TargetGroup  = var.backend_tg_arn_suffix
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = {
    Name        = "${var.project_name}-${var.environment}-backend-unhealthy-hosts"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Alarm 2: Backend EC2 CPU utilisation > 80% for 5 consecutive minutes
resource "aws_cloudwatch_metric_alarm" "backend_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-backend-cpu-high"
  alarm_description   = "Backend EC2 CPU utilisation exceeded 80% for 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    AutoScalingGroupName = var.backend_asg_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = {
    Name        = "${var.project_name}-${var.environment}-backend-cpu-high"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Alarm 3: RDS CPU utilisation > 80% for 5 consecutive minutes
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu-high"
  alarm_description   = "RDS PostgreSQL CPU utilisation exceeded 80% for 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_identifier
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-cpu-high"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Alarm 4: ALB 5XX error count > 10 in a 5-minute window
resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-5xx-errors"
  alarm_description   = "External ALB is returning more than 10 HTTP 5XX errors in 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.external_alb_arn_suffix
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = {
    Name        = "${var.project_name}-${var.environment}-alb-5xx-errors"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ---------------------------------------------------------------------------
# CloudWatch Dashboard
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_dashboard" "caresync" {
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      # Row 1: Backend EC2 metrics
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "Backend EC2 CPU Utilization (%)"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Average"
          period = 60
          metrics = [
            ["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", var.backend_asg_name]
          ]
          yAxis = { left = { min = 0, max = 100 } }
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "Backend Healthy Hosts"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Average"
          period = 60
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount",
              "LoadBalancer", var.external_alb_arn_suffix,
            "TargetGroup", var.backend_tg_arn_suffix]
          ]
          yAxis = { left = { min = 0 } }
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "Backend Unhealthy Hosts"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Maximum"
          period = 60
          metrics = [
            ["AWS/ApplicationELB", "UnHealthyHostCount",
              "LoadBalancer", var.external_alb_arn_suffix,
            "TargetGroup", var.backend_tg_arn_suffix]
          ]
          yAxis = { left = { min = 0 } }
        }
      },
      # Row 2: ALB metrics
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "ALB Total Requests"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Sum"
          period = 60
          metrics = [
            ["AWS/ApplicationELB", "RequestCount",
            "LoadBalancer", var.external_alb_arn_suffix]
          ]
          yAxis = { left = { min = 0 } }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "ALB 5XX Errors"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Sum"
          period = 60
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count",
            "LoadBalancer", var.external_alb_arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count",
            "LoadBalancer", var.external_alb_arn_suffix]
          ]
          yAxis = { left = { min = 0 } }
        }
      },
      # Row 3: RDS metrics
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "RDS CPU Utilization (%)"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Average"
          period = 60
          metrics = [
            ["AWS/RDS", "CPUUtilization",
            "DBInstanceIdentifier", var.rds_identifier]
          ]
          yAxis = { left = { min = 0, max = 100 } }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "RDS Database Connections"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Average"
          period = 60
          metrics = [
            ["AWS/RDS", "DatabaseConnections",
            "DBInstanceIdentifier", var.rds_identifier]
          ]
          yAxis = { left = { min = 0 } }
        }
      }
    ]
  })
}
