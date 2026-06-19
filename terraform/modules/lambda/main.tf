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
# Assuming deployment zip already exists or handled by build script
# (Skipped aws_lambda_function for brevity in script, it assumes zip is available)
