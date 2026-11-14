terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # Tags every resource, so anything left behind is easy to find in the console
  default_tags {
    tags = {
      Project   = "unque-appointment-api"
      ManagedBy = "terraform"
    }
  }
}