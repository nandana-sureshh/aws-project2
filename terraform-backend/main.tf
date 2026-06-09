# ===========================================================================
# Terraform Bootstrap — main.tf
#
# Creates the two AWS resources required for Terraform remote state:
#   1. S3 bucket  — stores terraform.tfstate files
#   2. DynamoDB   — provides state locking and consistency checking
#
# S3 Bucket Name: caresync-dev-tfstate-<account-id>
#   S3 bucket names are globally unique across all AWS accounts. Appending
#   the account ID makes the name deterministically unique and reproducible
#   without random suffixes.
#
# This project MUST use local state (no backend block). See versions.tf.
# ===========================================================================

locals {
  # Deterministic, globally unique bucket name — no random UUIDs needed.
  bucket_name = "${var.project_name}-${var.environment}-tfstate-${var.aws_account_id}"
  table_name  = "${var.project_name}-${var.environment}-tf-locks"
}

# ---------------------------------------------------------------------------
# S3 Bucket — Terraform State Storage
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "tfstate" {
  bucket = local.bucket_name

  # Prevent accidental deletion — Terraform will refuse to destroy this
  # bucket while it contains objects (state files). This is intentional.
  # To destroy, manually empty the bucket first.
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name    = local.bucket_name
    Purpose = "Terraform remote state storage"
  }
}

# Versioning — required for state history and rollback capability.
# Every terraform apply creates a new version. Old versions can be restored
# if a state file is accidentally corrupted or deleted.
resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption — AES-256 (SSE-S3).
# Chosen over KMS because:
#   - The project KMS CMK is managed by the MAIN Terraform project.
#   - The bootstrap project must not depend on or reference resources
#     outside its own scope (circular dependency risk).
#   - AES-256 satisfies encryption-at-rest requirements for Terraform state.
#     State files contain sensitive infrastructure details (RDS endpoints,
#     secret ARNs) and must be encrypted.
resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = false
  }
}

# Public access block — state files must never be publicly accessible.
# All four settings are enabled for defense-in-depth.
resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy — automatically expire noncurrent (old) state versions.
# Without this, every apply would permanently accumulate state history,
# resulting in unbounded storage growth and cost over time.
resource "aws_s3_bucket_lifecycle_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  # Lifecycle config requires versioning to be enabled first.
  depends_on = [aws_s3_bucket_versioning.tfstate]

  rule {
    id     = "expire-noncurrent-state-versions"
    status = "Enabled"

    # Apply to all objects in the bucket (all state files / workspaces)
    filter {}

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiry_days
    }
  }
}

# ---------------------------------------------------------------------------
# DynamoDB Table — Terraform State Locking
#
# Prevents concurrent applies from corrupting the state file.
# When terraform apply starts, it writes a lock item to this table.
# Any concurrent apply will fail with a "state locked" error and show
# the lock owner's ID, preventing race conditions.
#
# Required schema (mandated by Terraform):
#   - Partition key: LockID (String)
#   - No sort key
#   - No GSIs required
# ---------------------------------------------------------------------------

resource "aws_dynamodb_table" "tf_locks" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"  # No capacity planning — auto-scales
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"  # String — as required by Terraform's S3 backend
  }

  # Point-in-time recovery — allows table restoration to any point in
  # the last 35 days. Protects against accidental lock table deletion.
  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name    = local.table_name
    Purpose = "Terraform state locking"
  }
}
