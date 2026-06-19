resource "random_password" "db" {
  length  = 16
  special = false
}
resource "aws_db_subnet_group" "main" {
  name       = "${var.db_name}-subnet-group"
  subnet_ids = var.subnet_ids
}
resource "aws_db_instance" "main" {
  identifier        = replace(var.db_name, "_", "-")
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  db_name           = var.db_name
  username          = var.db_username
  password          = random_password.db.result
  vpc_security_group_ids = [var.security_group_id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  multi_az          = var.multi_az
  skip_final_snapshot = true
  storage_encrypted   = true
  kms_key_id          = var.kms_key_arn
}