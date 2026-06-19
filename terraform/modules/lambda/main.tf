resource "aws_sns_topic" "alerts" {
  name = "caresync-alerts"
}
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.notification_email
}
resource "aws_iam_role" "lambda_exec" {
  name = "caresync-reminder-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17", Statement = [{ Action = "sts:AssumeRole", Principal = { Service = "lambda.amazonaws.com" }, Effect = "Allow" }]
  })
}
resource "aws_iam_role_policy_attachment" "vpc_access" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
resource "aws_iam_role_policy" "lambda_policy" {
  role = aws_iam_role.lambda_exec.name
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      { Effect = "Allow", Action = "secretsmanager:GetSecretValue", Resource = var.secret_arn },
      { Effect = "Allow", Action = "ses:SendEmail", Resource = "*" }
    ]
  })
}
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/functions/appointment-reminder"
  output_path = "${path.module}/functions/appointment-reminder.zip"
}

resource "aws_lambda_function" "appointment_reminder" {
  function_name    = "caresync-appointment-reminder"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 60
  memory_size      = 256

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [var.security_group_id]
  }

  environment {
    variables = {
      SECRET_NAME    = var.secret_name
      SES_FROM_EMAIL = var.ses_from_email
    }
  }
}
