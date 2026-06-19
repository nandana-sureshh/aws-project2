data "aws_availability_zones" "available" {}
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"
  name = "${var.cluster_name}-vpc"
  cidr = var.vpc_cidr
  azs  = slice(data.aws_availability_zones.available.names, 0, 2)
  private_subnets  = [cidrsubnet(var.vpc_cidr, 4, 0), cidrsubnet(var.vpc_cidr, 4, 1)]
  public_subnets   = [cidrsubnet(var.vpc_cidr, 4, 2), cidrsubnet(var.vpc_cidr, 4, 3)]
  database_subnets = [cidrsubnet(var.vpc_cidr, 4, 4), cidrsubnet(var.vpc_cidr, 4, 5)]
  enable_nat_gateway = true
  single_nat_gateway = var.single_nat
  enable_dns_hostnames = true
  enable_dns_support   = true
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}
# VPC Endpoints
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = module.vpc.vpc_id
  service_name = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = module.vpc.private_route_table_ids
}
data "aws_region" "current" {}
resource "aws_vpc_endpoint" "sts" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.sts"
  vpc_endpoint_type = "Interface"
  subnet_ids        = module.vpc.private_subnets
  private_dns_enabled = true
  security_group_ids = [aws_security_group.vpce.id]
}
resource "aws_vpc_endpoint" "sqs" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.sqs"
  vpc_endpoint_type = "Interface"
  subnet_ids        = module.vpc.private_subnets
  private_dns_enabled = true
  security_group_ids = [aws_security_group.vpce.id]
}
resource "aws_security_group" "vpce" {
  name        = "${var.cluster_name}-vpce-sg"
  vpc_id      = module.vpc.vpc_id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
}