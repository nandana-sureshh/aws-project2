module "vpc" {
  source       = "../../modules/vpc"
  vpc_cidr     = var.vpc_cidr
  cluster_name = var.cluster_name
  single_nat   = true
}

module "security-groups" {
  source = "../../modules/security-groups"
  vpc_id = module.vpc.vpc_id
}

module "kms" {
  source = "../../modules/kms"
}

module "s3" {
  source = "../../modules/s3"
  bucket_prefix = "caresync-docs-dev-"
  kms_key_arn   = module.kms.key_arn
}

module "sqs" {
  source = "../../modules/sqs"
  kms_key_arn = module.kms.key_arn
}

module "rds" {
  source              = "../../modules/rds"
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.database_subnets
  security_group_id   = module.security-groups.rds_sg_id
  db_name             = "caresync_dev"
  db_username         = var.db_username
  multi_az            = false
  kms_key_arn         = module.kms.key_arn
}

module "secrets-manager" {
  source             = "../../modules/secrets-manager"
  kms_key_arn        = module.kms.key_arn
  database_url       = "postgresql://${var.db_username}:${module.rds.db_password}@${module.rds.endpoint}/caresync_dev"
  sqs_queue_url      = module.sqs.queue_url
  s3_bucket_name     = module.s3.bucket_name
  frontend_url       = "http://k8s-caresync-caresync-cfc825078f-579067473.us-east-1.elb.amazonaws.com"
  api_base_url       = "http://k8s-caresync-caresync-cfc825078f-579067473.us-east-1.elb.amazonaws.com/api"
  ses_from_email     = var.ses_from_email
  notification_email = var.notification_email
}

module "ecr" {
  source = "../../modules/ecr"
}

module "eks" {
  source             = "../../modules/eks"
  cluster_name       = var.cluster_name
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  cluster_sg_id      = module.security-groups.eks_cluster_sg_id
  node_sg_id         = module.security-groups.eks_node_sg_id
  kms_key_arn        = module.kms.key_arn
  node_instance_type = "t3.medium"
  node_min_size      = 2
  node_max_size      = 4
  node_desired_size  = 2
}

module "iam-irsa" {
  source          = "../../modules/iam-irsa"
  cluster_name    = var.cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  s3_bucket_arn   = module.s3.bucket_arn
  sqs_queue_arn   = module.sqs.queue_arn
  kms_key_arn     = module.kms.key_arn
  secret_arn      = module.secrets-manager.secret_arn
}

module "ses" {
  source       = "../../modules/ses"
  from_email   = var.ses_from_email
}

module "cloudwatch" {
  source        = "../../modules/cloudwatch"
  cluster_name  = var.cluster_name
  sqs_dlq_name  = module.sqs.dlq_name
  sns_topic_arn = module.lambda.alerts_topic_arn
}

module "lambda" {
  source             = "../../modules/lambda"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  security_group_id  = module.security-groups.lambda_sg_id
  secret_name        = module.secrets-manager.secret_name
  secret_arn         = module.secrets-manager.secret_arn
  ses_from_email     = var.ses_from_email
  notification_email = var.notification_email
}