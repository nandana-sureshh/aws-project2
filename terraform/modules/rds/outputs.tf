output "endpoint" { value = aws_db_instance.main.endpoint }
output "db_password" {
  value     = random_password.db.result
  sensitive = true
}