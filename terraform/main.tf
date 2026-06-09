# ===========================================================================
# EXISTING MODULES (Phase 1 — validated, do not modify module blocks)
# ===========================================================================

module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment

  vpc_cidr = "10.0.0.0/16"

  availability_zones = [
    "us-east-1a",
    "us-east-1b"
  ]

  public_subnet_cidrs = [
    "10.0.1.0/24",
    "10.0.2.0/24"
  ]

  frontend_subnet_cidrs = [
    "10.0.11.0/24",
    "10.0.12.0/24"
  ]

  backend_subnet_cidrs = [
    "10.0.21.0/24",
    "10.0.22.0/24"
  ]

  database_subnet_cidrs = [
    "10.0.31.0/24",
    "10.0.32.0/24"
  ]
}

module "security_groups" {
  source = "./modules/security-groups"

  vpc_id       = module.vpc.vpc_id
  project_name = var.project_name
}

module "bastion" {
  source = "./modules/bastion"

  project_name     = var.project_name
  public_subnet_id = module.vpc.public_subnet_ids[0]
  bastion_sg_id    = module.security_groups.bastion_sg_id
  key_name         = "kubernetes-project"
}

module "alb" {
  source = "./modules/alb"

  project_name = var.project_name
  vpc_id       = module.vpc.vpc_id

  public_subnet_ids  = module.vpc.public_subnet_ids
  backend_subnet_ids = module.vpc.backend_subnet_ids

  external_alb_sg_id = module.security_groups.external_alb_sg_id
  internal_alb_sg_id = module.security_groups.internal_alb_sg_id
}


module "kms" {
  source = "./modules/kms"

  project_name   = var.project_name
  environment    = var.environment
  aws_account_id = var.aws_account_id
  aws_region     = var.aws_region
}

module "secrets_manager" {
  source = "./modules/secrets-manager"

  project_name = var.project_name
  environment  = var.environment
  kms_key_arn  = module.kms.kms_key_arn
}

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
  kms_key_arn  = module.kms.kms_key_arn
}

module "iam" {
  source = "./modules/iam"

  project_name   = var.project_name
  environment    = var.environment
  aws_account_id = var.aws_account_id
  aws_region     = var.aws_region
  secret_arn     = module.secrets_manager.secret_arn
  s3_bucket_arn  = module.s3.bucket_arn
  kms_key_arn    = module.kms.kms_key_arn
}

module "rds" {
  source = "./modules/rds"

  project_name = var.project_name
  environment  = var.environment

  database_subnet_ids = module.vpc.database_subnet_ids
  database_sg_id      = module.security_groups.database_sg_id
  kms_key_arn         = module.kms.kms_key_arn

  db_name     = "caresync"
  db_username = var.db_username
  db_password = var.db_password
}

module "launch_templates" {
  source = "./modules/launch-templates"

  project_name = var.project_name
  environment  = var.environment

  key_name       = "kubernetes-project"
  aws_region     = var.aws_region
  s3_bucket_name = module.s3.bucket_name
  secret_name    = module.secrets_manager.secret_name

  frontend_sg_id = module.security_groups.frontend_sg_id
  backend_sg_id  = module.security_groups.backend_sg_id

  backend_instance_profile_name = module.iam.backend_instance_profile_name
}

module "asg" {
  source = "./modules/asg"

  project_name = var.project_name
  environment  = var.environment

  frontend_subnet_ids = module.vpc.frontend_subnet_ids
  backend_subnet_ids  = module.vpc.backend_subnet_ids

  frontend_launch_template_id      = module.launch_templates.frontend_launch_template_id
  frontend_launch_template_version = tostring(module.launch_templates.frontend_launch_template_version)
  backend_launch_template_id       = module.launch_templates.backend_launch_template_id
  backend_launch_template_version  = tostring(module.launch_templates.backend_launch_template_version)

  # Frontend TG is on External ALB — path-based routing handles /api/* → backend
  frontend_target_group_arn = module.alb.frontend_target_group_arn
  # Backend TG is External ALB, Internal Backend TG is Internal ALB
  backend_target_group_arn          = module.alb.backend_target_group_arn
  internal_backend_target_group_arn = module.alb.internal_backend_target_group_arn
}

# ===========================================================================
# MODULES — CloudWatch Observability
# ===========================================================================

module "cloudwatch" {
  source = "./modules/cloudwatch"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region
  kms_key_arn  = module.kms.kms_key_arn

  # Alarm dimensions
  backend_asg_name        = module.asg.backend_asg_name
  rds_identifier          = module.rds.db_identifier
  external_alb_arn_suffix = module.alb.external_alb_arn_suffix
  backend_tg_arn_suffix   = module.alb.backend_tg_arn_suffix

  # Phase 2: CloudWatch alarms now deliver to SNS
  alarm_actions = [module.sns.topic_arn]
}

# ===========================================================================
# MODULES — SNS
# ===========================================================================

module "sns" {
  source = "./modules/sns"

  project_name = var.project_name
  environment  = var.environment
  kms_key_arn  = module.kms.kms_key_arn
  alert_email  = var.alert_email
}

# ===========================================================================
#MODULES — Lambda + EventBridge Scheduler
# ===========================================================================

module "lambda" {
  source = "./modules/lambda"

  project_name   = var.project_name
  environment    = var.environment
  aws_region     = var.aws_region
  aws_account_id = var.aws_account_id

  # Networking — Lambda runs in backend private subnets (same as EC2)
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.backend_subnet_ids
  backend_sg_id      = module.security_groups.backend_sg_id
  database_sg_id     = module.security_groups.database_sg_id

  # Secrets / KMS — reuse existing project secret and CMK
  secret_arn  = module.secrets_manager.secret_arn
  secret_name = module.secrets_manager.secret_name
  kms_key_arn = module.kms.kms_key_arn

  # SNS — reminder Lambda publishes here
  sns_topic_arn = module.sns.topic_arn

  # CloudWatch log groups — pre-created by cloudwatch module (KMS-encrypted)
  reminder_log_group_name = module.cloudwatch.lambda_reminder_log_group_name
  cleanup_log_group_name  = module.cloudwatch.lambda_cleanup_log_group_name

  # Business logic configuration
  reminder_window_hours       = 24
  notification_retention_days = var.notification_retention_days

  # Scheduling (UTC) — EventBridge Scheduler cron expressions
  reminder_schedule = "rate(1 hour)"        # Hourly execution
  cleanup_schedule  = "cron(0 2 * * ? *)"   # 02:00 UTC daily

  depends_on = [module.cloudwatch]
}

# ===========================================================================
# MODULES — WAF
# ===========================================================================

module "waf" {
  source = "./modules/waf"

  project_name = var.project_name
  environment  = var.environment
}

# ===========================================================================
# MODULES — CloudFront CDN
# ===========================================================================

module "cloudfront" {
  source = "./modules/cloudfront"

  project_name = var.project_name
  environment  = var.environment

  # Consume the existing External ALB DNS name as the CloudFront origin.
  # No ALB resource is modified — only the DNS string is passed.
  alb_dns_name = module.alb.external_alb_dns_name
  web_acl_arn  = module.waf.web_acl_arn
}