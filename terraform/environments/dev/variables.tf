variable "aws_region" {
  type    = string
  default = "us-east-1"
}
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}
variable "cluster_name" {
  type    = string
  default = "caresync-dev"
}
variable "db_username" {
  type    = string
  default = "postgres"
}
variable "notification_email" {
  type    = string
}
variable "ses_from_email" {
  type    = string
}