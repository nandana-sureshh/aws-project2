# ===========================================================================
# CareSync Lambda Module
#
# Creates:
#   1. Lambda Security Group (egress: RDS 5432, HTTPS 443 for Secrets Manager/SNS)
#   2. Security Group Rule — allow Lambda SG to connect to RDS SG on port 5432
#   3. IAM Execution Role for appointment-reminder Lambda (least-privilege)
#   4. IAM Execution Role for notification-cleanup Lambda (least-privilege)
#   5. Lambda: appointment-reminder (Node.js 20, VPC, EventBridge Scheduler)
#   6. Lambda: notification-cleanup (Node.js 20, VPC, EventBridge Scheduler)
#   7. EventBridge Scheduler IAM Role (to invoke Lambda functions)
#   8. EventBridge Scheduler: appointment-reminder (daily 08:00 UTC)
#   9. EventBridge Scheduler: notification-cleanup  (daily 02:00 UTC)
#
# Lambda deployment packages:
#   - Built from local source in functions/<name>/ directories
#   - Terraform data.archive_file zips index.mjs + node_modules
#   - New zip is deployed only when source content changes (via source_content_hash)
# ===========================================================================

# ---------------------------------------------------------------------------
# Lambda Security Group
# Placed in private backend subnets.
# Egress:
#   - Port 5432 to database_sg (PostgreSQL via RDS)
#   - Port 443 to 0.0.0.0/0 (HTTPS for Secrets Manager + SNS via NAT Gateway)
# No ingress rules — Lambda is triggered only by EventBridge Scheduler.
# ---------------------------------------------------------------------------

resource "aws_security_group" "lambda" {
  name        = "${var.project_name}-${var.environment}-lambda-sg"
  description = "Lambda functions - egress to RDS (5432) and AWS APIs (443)"
  vpc_id      = var.vpc_id

  egress {
    description = "HTTPS to AWS service endpoints via NAT Gateway (Secrets Manager, SNS, CloudWatch Logs)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "PostgreSQL to RDS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.database_sg_id]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-sg"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Allow Lambda security group to reach RDS security group on port 5432
resource "aws_security_group_rule" "lambda_to_rds" {
  type                     = "ingress"
  description              = "Allow Lambda functions to connect to PostgreSQL"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.lambda.id
  security_group_id        = var.database_sg_id
}

# ---------------------------------------------------------------------------
# IAM: Appointment Reminder Lambda Execution Role
# Permissions (all resource-scoped, no wildcards):
#   - secretsmanager:GetSecretValue → project app secret only
#   - kms:Decrypt, kms:DescribeKey  → project CMK only (for secret decryption)
#   - sns:Publish                   → project alerts topic only
#   - logs:CreateLogStream, logs:PutLogEvents → reminder log group only
#   - ec2:CreateNetworkInterface, ec2:DeleteNetworkInterface,
#     ec2:DescribeNetworkInterfaces → required for VPC-attached Lambda
# ---------------------------------------------------------------------------

resource "aws_iam_role" "reminder_lambda" {
  name        = "${var.project_name}-${var.environment}-reminder-lambda-role"
  description = "Execution role for the appointment-reminder Lambda function"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowLambdaAssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-reminder-lambda-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_iam_role_policy" "reminder_secrets" {
  name = "${var.project_name}-${var.environment}-reminder-secrets"
  role = aws_iam_role.reminder_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "ReadAppSecret"
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = var.secret_arn
    }]
  })
}

resource "aws_iam_role_policy" "reminder_kms" {
  name = "${var.project_name}-${var.environment}-reminder-kms"
  role = aws_iam_role.reminder_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "UseCMK"
      Effect = "Allow"
      Action = [
        "kms:Decrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ]
      Resource = var.kms_key_arn
    }]
  })
}

resource "aws_iam_role_policy" "reminder_sns" {
  name = "${var.project_name}-${var.environment}-reminder-sns"
  role = aws_iam_role.reminder_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "PublishToAlertsTopic"
      Effect = "Allow"
      Action = ["sns:Publish"]
      Resource = var.sns_topic_arn
    }]
  })
}

resource "aws_iam_role_policy" "reminder_logs" {
  name = "${var.project_name}-${var.environment}-reminder-logs"
  role = aws_iam_role.reminder_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "WriteLambdaLogs"
      Effect = "Allow"
      Action = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:${var.reminder_log_group_name}:*"
    }]
  })
}

# VPC networking permissions for Lambda ENI management
resource "aws_iam_role_policy" "reminder_vpc" {
  name = "${var.project_name}-${var.environment}-reminder-vpc"
  role = aws_iam_role.reminder_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "ManageVPCNetworkInterface"
      Effect = "Allow"
      Action = [
        "ec2:CreateNetworkInterface",
        "ec2:DeleteNetworkInterface",
        "ec2:DescribeNetworkInterfaces"
      ]
      Resource = "*"
    }]
  })
}

# ---------------------------------------------------------------------------
# IAM: Notification Cleanup Lambda Execution Role
# Permissions:
#   - secretsmanager:GetSecretValue → project app secret only
#   - kms:Decrypt, kms:DescribeKey  → project CMK only
#   - logs:CreateLogStream, logs:PutLogEvents → cleanup log group only
#   - ec2:* → VPC ENI management
# Note: No SNS permission — cleanup does not send notifications.
# ---------------------------------------------------------------------------

resource "aws_iam_role" "cleanup_lambda" {
  name        = "${var.project_name}-${var.environment}-cleanup-lambda-role"
  description = "Execution role for the notification-cleanup Lambda function"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowLambdaAssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-cleanup-lambda-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_iam_role_policy" "cleanup_secrets" {
  name = "${var.project_name}-${var.environment}-cleanup-secrets"
  role = aws_iam_role.cleanup_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "ReadAppSecret"
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = var.secret_arn
    }]
  })
}

resource "aws_iam_role_policy" "cleanup_kms" {
  name = "${var.project_name}-${var.environment}-cleanup-kms"
  role = aws_iam_role.cleanup_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DecryptWithCMK"
      Effect = "Allow"
      Action = ["kms:Decrypt", "kms:DescribeKey"]
      Resource = var.kms_key_arn
    }]
  })
}

resource "aws_iam_role_policy" "cleanup_logs" {
  name = "${var.project_name}-${var.environment}-cleanup-logs"
  role = aws_iam_role.cleanup_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "WriteLambdaLogs"
      Effect = "Allow"
      Action = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:${var.cleanup_log_group_name}:*"
    }]
  })
}

resource "aws_iam_role_policy" "cleanup_vpc" {
  name = "${var.project_name}-${var.environment}-cleanup-vpc"
  role = aws_iam_role.cleanup_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "ManageVPCNetworkInterface"
      Effect = "Allow"
      Action = [
        "ec2:CreateNetworkInterface",
        "ec2:DeleteNetworkInterface",
        "ec2:DescribeNetworkInterfaces"
      ]
      Resource = "*"
    }]
  })
}

# ---------------------------------------------------------------------------
# Lambda Deployment Packages
# Terraform archives the function directory including node_modules.
# The archive is recreated only when file contents change.
# ---------------------------------------------------------------------------

data "archive_file" "reminder_zip" {
  type        = "zip"
  source_dir  = "${path.module}/functions/appointment-reminder"
  output_path = "${path.module}/functions/appointment-reminder.zip"
}

data "archive_file" "cleanup_zip" {
  type        = "zip"
  source_dir  = "${path.module}/functions/notification-cleanup"
  output_path = "${path.module}/functions/notification-cleanup.zip"
}

# ---------------------------------------------------------------------------
# Lambda Functions
# ---------------------------------------------------------------------------

resource "aws_lambda_function" "appointment_reminder" {
  function_name    = "${var.project_name}-${var.environment}-appointment-reminder"
  description      = "Sends appointment reminders for upcoming 24h appointments via SNS"
  role             = aws_iam_role.reminder_lambda.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  timeout          = 60
  memory_size      = 256

  filename         = data.archive_file.reminder_zip.output_path
  source_code_hash = data.archive_file.reminder_zip.output_base64sha256

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      AWS_REGION_NAME        = var.aws_region  # named AWS_REGION_NAME to avoid conflict with reserved AWS_REGION
      SECRET_NAME            = var.secret_name
      SNS_TOPIC_ARN          = var.sns_topic_arn
      REMINDER_WINDOW_HOURS  = tostring(var.reminder_window_hours)
    }
  }

  # Use KMS CMK for environment variable encryption at rest
  kms_key_arn = var.kms_key_arn

  depends_on = [
    aws_iam_role_policy.reminder_secrets,
    aws_iam_role_policy.reminder_kms,
    aws_iam_role_policy.reminder_sns,
    aws_iam_role_policy.reminder_logs,
    aws_iam_role_policy.reminder_vpc,
  ]

  tags = {
    Name        = "${var.project_name}-${var.environment}-appointment-reminder"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Appointment reminder automation"
  }
}

resource "aws_lambda_function" "notification_cleanup" {
  function_name    = "${var.project_name}-${var.environment}-notification-cleanup"
  description      = "Deletes notifications older than RETENTION_DAYS from the database"
  role             = aws_iam_role.cleanup_lambda.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  timeout          = 60
  memory_size      = 128

  filename         = data.archive_file.cleanup_zip.output_path
  source_code_hash = data.archive_file.cleanup_zip.output_base64sha256

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      AWS_REGION_NAME  = var.aws_region
      SECRET_NAME      = var.secret_name
      RETENTION_DAYS   = tostring(var.notification_retention_days)
    }
  }

  kms_key_arn = var.kms_key_arn

  depends_on = [
    aws_iam_role_policy.cleanup_secrets,
    aws_iam_role_policy.cleanup_kms,
    aws_iam_role_policy.cleanup_logs,
    aws_iam_role_policy.cleanup_vpc,
  ]

  tags = {
    Name        = "${var.project_name}-${var.environment}-notification-cleanup"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Notification retention cleanup automation"
  }
}

# ---------------------------------------------------------------------------
# EventBridge Scheduler IAM Role
# Scoped to invoke only the two Lambda functions created above.
# ---------------------------------------------------------------------------

resource "aws_iam_role" "scheduler" {
  name        = "${var.project_name}-${var.environment}-scheduler-role"
  description = "EventBridge Scheduler role - invoke CareSync Lambda functions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowSchedulerAssumeRole"
      Effect = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-scheduler-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_iam_role_policy" "scheduler_invoke" {
  name = "${var.project_name}-${var.environment}-scheduler-invoke"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "InvokeCaresSyncLambdas"
      Effect = "Allow"
      Action = ["lambda:InvokeFunction"]
      Resource = [
        aws_lambda_function.appointment_reminder.arn,
        aws_lambda_function.notification_cleanup.arn,
      ]
    }]
  })
}

# ---------------------------------------------------------------------------
# EventBridge Scheduler Schedules
# Using EventBridge Scheduler (not EventBridge Rules) as required.
# schedule_expression uses cron() in UTC.
# flexible_time_window = OFF for exact execution.
# ---------------------------------------------------------------------------

resource "aws_scheduler_schedule" "appointment_reminder" {
  name        = "${var.project_name}-${var.environment}-appointment-reminder"
  description = "Daily appointment reminder - runs at 08:00 UTC, finds next-24h appointments"
  group_name  = "default"

  schedule_expression          = var.reminder_schedule
  schedule_expression_timezone = "UTC"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.appointment_reminder.arn
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({ source = "eventbridge-scheduler" })

    retry_policy {
      maximum_retry_attempts = 2
    }
  }
}

resource "aws_scheduler_schedule" "notification_cleanup" {
  name        = "${var.project_name}-${var.environment}-notification-cleanup"
  description = "Daily notification cleanup - runs at 02:00 UTC, deletes records older than RETENTION_DAYS"
  group_name  = "default"

  schedule_expression          = var.cleanup_schedule
  schedule_expression_timezone = "UTC"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.notification_cleanup.arn
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({ source = "eventbridge-scheduler" })

    retry_policy {
      maximum_retry_attempts = 2
    }
  }
}
