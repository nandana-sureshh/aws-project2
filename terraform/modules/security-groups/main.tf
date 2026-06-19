resource "aws_security_group" "eks_cluster" {
  name   = "eks-cluster-sg"
  vpc_id = var.vpc_id
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}
resource "aws_security_group" "eks_nodes" {
  name   = "eks-nodes-sg"
  vpc_id = var.vpc_id
  ingress { from_port = 0; to_port = 0; protocol = "-1"; self = true }
  ingress { from_port = 0; to_port = 0; protocol = "-1"; security_groups = [aws_security_group.eks_cluster.id] }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}
resource "aws_security_group" "rds" {
  name   = "rds-sg"
  vpc_id = var.vpc_id
  ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; security_groups = [aws_security_group.eks_nodes.id] }
  ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; security_groups = [aws_security_group.lambda.id] }
}
resource "aws_security_group" "bastion" {
  name   = "bastion-sg"
  vpc_id = var.vpc_id
  ingress { from_port = 22; to_port = 22; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}
resource "aws_security_group" "lambda" {
  name   = "lambda-sg"
  vpc_id = var.vpc_id
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}