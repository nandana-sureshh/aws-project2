resource "aws_ses_email_identity" "from" {
  email = var.from_email
}