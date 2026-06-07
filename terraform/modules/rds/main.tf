# --- RDS Subnet Group ---

resource "aws_db_subnet_group" "caresync" {
  name        = "${var.project_name}-${var.environment}-db-subnet-group"
  description = "CareSync RDS subnet group - database private subnets"
  subnet_ids  = var.database_subnet_ids

  tags = {
    Name        = "${var.project_name}-${var.environment}-db-subnet-group"
    Environment = var.environment
    Project     = var.project_name
  }
}

# --- RDS PostgreSQL Instance ---

resource "aws_db_instance" "postgres" {
  identifier = "${var.project_name}-${var.environment}-postgres"

  engine = "postgres"
  # Use major version only — AWS selects latest available patch in the region.
  # Do NOT pin to "16.3" — minor versions vary by region and may not exist.
  engine_version = "16"

  instance_class = var.db_instance_class

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  db_subnet_group_name   = aws_db_subnet_group.caresync.name
  vpc_security_group_ids = [var.database_sg_id]

  # Not publicly accessible — only reachable from backend security group
  publicly_accessible = false

  # Automated backups — 7 days retention
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Performance Insights disabled — db.t3.micro does not support it
  performance_insights_enabled = false

  # Monitoring
  monitoring_interval = 0

  # Deletion settings (dev-appropriate — change for production)
  deletion_protection = false
  skip_final_snapshot = true

  apply_immediately = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-postgres"
    Environment = var.environment
    Project     = var.project_name
  }
}
