
data "aws_iam_policy_document" "assume_role_policy" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(var.oidc_provider_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:kube-system:aws-load-balancer-controller"]
    }
  }
}
resource "aws_iam_role" "albc" {
  name               = "${var.cluster_name}-albc-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json
}
resource "aws_iam_policy" "albc_policy" {
  name        = "${var.cluster_name}-albc-policy"
  description = "IAM policy for AWS Load Balancer Controller"
  policy      = file("${path.module}/policies/iam_policy.json")
}

resource "aws_iam_role_policy_attachment" "albc_attach" {
  role       = aws_iam_role.albc.name
  policy_arn = aws_iam_policy.albc_policy.arn
}

# External Secrets Role
data "aws_iam_policy_document" "eso_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(var.oidc_provider_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:caresync-dev:external-secrets-sa"]
    }
  }
}
resource "aws_iam_role" "eso" {
  name = "${var.cluster_name}-eso-role"
  assume_role_policy = data.aws_iam_policy_document.eso_assume.json
}
resource "aws_iam_role_policy" "eso_policy" {
  role = aws_iam_role.eso.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = var.secret_arn },
      { Effect = "Allow", Action = ["kms:Decrypt"], Resource = var.kms_key_arn }
    ]
  })
}

# Service Roles
resource "aws_iam_role" "ai_service" {
  name = "${var.cluster_name}-ai-service-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow", Action = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = var.oidc_provider_arn }
      Condition = { StringEquals = { "${replace(var.oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:caresync-dev:ai-service-sa" } }
    }]
  })
}
resource "aws_iam_role_policy" "ai_service_policy" {
  role = aws_iam_role.ai_service.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"], Resource = var.sqs_queue_arn },
      { Effect = "Allow", Action = ["s3:ListBucket"], Resource = var.s3_bucket_arn },
      { Effect = "Allow", Action = ["s3:GetObject"], Resource = "${var.s3_bucket_arn}/*" },
      { Effect = "Allow", Action = ["bedrock:InvokeModel"], Resource = "*" },
      { Effect = "Allow", Action = ["kms:Decrypt"], Resource = var.kms_key_arn }
    ]
  })
}

resource "aws_iam_role" "doc_service" {
  name = "${var.cluster_name}-doc-service-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow", Action = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = var.oidc_provider_arn }
      Condition = { StringEquals = { "${replace(var.oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:caresync-dev:document-service-sa" } }
    }]
  })
}
resource "aws_iam_role_policy" "doc_service_policy" {
  role = aws_iam_role.doc_service.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["sqs:SendMessage"], Resource = var.sqs_queue_arn },
      { Effect = "Allow", Action = ["s3:ListBucket"], Resource = var.s3_bucket_arn },
      { Effect = "Allow", Action = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"], Resource = "${var.s3_bucket_arn}/*" },
      { Effect = "Allow", Action = ["kms:GenerateDataKey", "kms:Decrypt"], Resource = var.kms_key_arn }
    ]
  })
}
