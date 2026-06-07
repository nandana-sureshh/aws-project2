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

  project_name = var.project_name

  public_subnet_id = module.vpc.public_subnet_ids[0]

  bastion_sg_id = module.security_groups.bastion_sg_id

  key_name = "kubernetes-project"
}

module "alb" {
  source = "./modules/alb"

  project_name = var.project_name

  vpc_id = module.vpc.vpc_id

  public_subnet_ids  = module.vpc.public_subnet_ids
  backend_subnet_ids = module.vpc.backend_subnet_ids

  external_alb_sg_id = module.security_groups.external_alb_sg_id
  internal_alb_sg_id = module.security_groups.internal_alb_sg_id
}