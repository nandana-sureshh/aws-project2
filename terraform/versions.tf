terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "caresync-dev-tfstate-664685894054"
    key            = "caresync/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "caresync-dev-tf-locks"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}