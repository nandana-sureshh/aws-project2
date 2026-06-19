locals {
  repos = ["auth-service", "user-service", "appointment-service", "document-service", "notification-service", "ai-service", "frontend"]
}
resource "aws_ecr_repository" "repos" {
  for_each = toset(local.repos)
  name                 = "caresync/${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
  image_scanning_configuration { scan_on_push = true }
}
resource "aws_ecr_lifecycle_policy" "repos" {
  for_each   = toset(local.repos)
  repository = aws_ecr_repository.repos[each.key].name
  policy = jsonencode({
    rules = [{
      rulePriority = 1,
      description  = "Keep last 10 images",
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 10 },
      action       = { type = "expire" }
    }]
  })
}