# ===========================================================================
# Terraform Bootstrap — versions.tf
#
# Constraints deliberately match the main CareSync Terraform project so that
# both projects use the same provider binary from the local plugin cache.
# ===========================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # -------------------------------------------------------------------------
  # NO backend block here — bootstrap project always uses LOCAL state.
  #
  # Why: This project creates the S3 bucket and DynamoDB table that will
  # store remote state. You cannot store this project's own state in the
  # backend it is provisioning (chicken-and-egg problem).
  #
  # The resulting terraform.tfstate file for THIS project is intentionally
  # small, contains no secrets, and should be committed to version control
  # so the bucket is never accidentally recreated.
  # -------------------------------------------------------------------------
}
