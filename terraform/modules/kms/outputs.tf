output "kms_key_id" {
  description = "The KMS Customer Managed Key ID"
  value       = aws_kms_key.caresync.key_id
}

output "kms_key_arn" {
  description = "The KMS Customer Managed Key ARN"
  value       = aws_kms_key.caresync.arn
}
