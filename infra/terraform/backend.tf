# Where Terraform keeps its state. The bucket comes from
# scripts/bootstrap-state.sh, which also writes backend.hcl, because a backend
# block can't use variables. Start with:
#   terraform init -backend-config=backend.hcl
terraform {
  backend "s3" {}
}