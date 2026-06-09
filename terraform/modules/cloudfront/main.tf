# ===========================================================================
# CloudFront Distribution — CareSync
#
# Origin: External ALB (HTTP only — ALB has no HTTPS listener at this stage)
# No WAF, no custom domain, no ACM certificate in this phase.
#
# Cache behaviors:
#   /api/*  (ordered, priority 0) — CachingDisabled, all methods forwarded
#   /*      (default)             — CachingOptimized, GET/HEAD only
# ===========================================================================

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  comment             = "${var.project_name}-${var.environment}-cloudfront"
  default_root_object = "index.html"
  web_acl_id          = var.web_acl_arn

  # PriceClass_200: US, Europe, Asia, Middle East, Africa.
  # Chosen because the application is primarily accessed from India / Asia.
  price_class = "PriceClass_200"

  # ---------------------------------------------------------------------------
  # Origin — External ALB
  # CloudFront → ALB on HTTP/80 (ALB only has an HTTP listener today).
  # ---------------------------------------------------------------------------
  origin {
    domain_name = var.alb_dns_name
    origin_id   = "ExternalALB"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ---------------------------------------------------------------------------
  # Ordered cache behavior 0: /api/* — pass-through, no caching
  #
  # AWS managed policy IDs (global, not created by Terraform):
  #   CachingDisabled  : 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
  #   AllViewer        : 216adef6-5c7f-47e4-b989-5492eafa07d3
  # ---------------------------------------------------------------------------
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    target_origin_id = "ExternalALB"

    # Never cache API responses
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"

    # Forward all headers, cookies, and query strings to preserve
    # authentication tokens, CORS headers, and dynamic query params.
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"

    viewer_protocol_policy = "allow-all"

    # Full REST method support for API endpoints
    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods  = ["GET", "HEAD"]

    compress = false
  }

  # ---------------------------------------------------------------------------
  # Default cache behavior: /* — frontend static assets
  # ---------------------------------------------------------------------------
  default_cache_behavior {
    target_origin_id = "ExternalALB"

    cache_policy_id          = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"

    viewer_protocol_policy = "allow-all"

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    # Brotli/gzip compression at CloudFront edge — reduces transfer size for
    # HTML, JS, CSS. nginx also compresses at origin; CloudFront deduplicates.
    compress = true
  }

  # ---------------------------------------------------------------------------
  # Geo restriction — none (global access)
  # ---------------------------------------------------------------------------
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # ---------------------------------------------------------------------------
  # Viewer certificate — default *.cloudfront.net certificate.
  # No custom domain or ACM certificate in this phase.
  # ---------------------------------------------------------------------------
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cloudfront"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Phase       = "6"
  }
}
