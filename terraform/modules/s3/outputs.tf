output "bucket_name" {
  description = "S3 documents bucket name"
  value       = aws_s3_bucket.documents.bucket
}

output "bucket_arn" {
  description = "S3 documents bucket ARN"
  value       = aws_s3_bucket.documents.arn
}

output "bucket_regional_domain_name" {
  description = "S3 regional domain name"
  value       = aws_s3_bucket.documents.bucket_regional_domain_name
}
