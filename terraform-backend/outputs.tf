# ===========================================================================
# Terraform Bootstrap — outputs.tf
#
# Outputs serve two purposes:
#   1. Confirm what was created after terraform apply
#   2. Provide the exact values to copy into the main project's backend block
#      when Phase 2 (backend migration) is performed
# ===========================================================================

output "state_bucket_name" {
  description = "S3 bucket name — copy this into the main project's backend block as 'bucket'"
  value       = aws_s3_bucket.tfstate.id
}

output "state_bucket_arn" {
  description = "S3 bucket ARN — use this in IAM policies to grant state access"
  value       = aws_s3_bucket.tfstate.arn
}

output "state_bucket_region" {
  description = "AWS region where the state bucket was created — must match 'region' in the backend block"
  value       = aws_s3_bucket.tfstate.region
}

output "dynamodb_table_name" {
  description = "DynamoDB table name — copy this into the main project's backend block as 'dynamodb_table'"
  value       = aws_dynamodb_table.tf_locks.id
}

output "dynamodb_table_arn" {
  description = "DynamoDB table ARN — use this in IAM policies to grant lock access"
  value       = aws_dynamodb_table.tf_locks.arn
}

output "backend_config_snippet" {
  description = <<-EOT
    Copy this backend block into terraform/versions.tf of the main CareSync project.
    Run 'terraform init -migrate-state' in the main project directory after adding it.
  EOT
  value = <<-BACKEND
    # Add this backend block to terraform/versions.tf in the main project:

    terraform {
      backend "s3" {
        bucket         = "${aws_s3_bucket.tfstate.id}"
        key            = "caresync/dev/terraform.tfstate"
        region         = "${aws_s3_bucket.tfstate.region}"
        dynamodb_table = "${aws_dynamodb_table.tf_locks.id}"
        encrypt        = true
      }
    }
  BACKEND
}
