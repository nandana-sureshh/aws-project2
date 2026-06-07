# --- S3 Documents Bucket ---

resource "aws_s3_bucket" "documents" {
  bucket = "${var.project_name}-${var.environment}-documents"

  # During development, allow terraform destroy to remove all objects.
  # Set to false in production.
  force_destroy = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-documents"
    Environment = var.environment
    Project     = var.project_name
  }
}

# --- Block All Public Access ---

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --- SSE-KMS Encryption ---

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }

    # bucket_key_enabled reduces the number of KMS API calls
    # by generating a bucket-level data key instead of per-object
    bucket_key_enabled = true
  }
}

# --- Versioning ---

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

# --- Lifecycle: expire old non-current versions after 90 days ---

resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  # lifecycle requires versioning to be enabled first
  depends_on = [aws_s3_bucket_versioning.documents]

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
