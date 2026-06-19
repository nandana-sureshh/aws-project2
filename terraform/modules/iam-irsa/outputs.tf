
output "role_arns" {
  value = {
    albc = aws_iam_role.albc.arn
    eso = aws_iam_role.eso.arn
    ai_service = aws_iam_role.ai_service.arn
    doc_service = aws_iam_role.doc_service.arn
  }
}