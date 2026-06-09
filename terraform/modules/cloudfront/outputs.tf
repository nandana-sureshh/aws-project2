output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name (*.cloudfront.net) — use as VITE_API_URL after deployment"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — needed for cache invalidation (aws cloudfront create-invalidation)"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront hosted zone ID — use when creating a Route53 alias record in a future phase"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "cloudfront_arn" {
  description = "CloudFront distribution ARN — use when attaching WAF WebACL in a future phase"
  value       = aws_cloudfront_distribution.main.arn
}
