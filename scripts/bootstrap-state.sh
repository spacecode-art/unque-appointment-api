#!/usr/bin/env bash
# Creates the S3 bucket that holds Terraform's state, locked down, and writes
# infra/terraform/backend.hcl pointing at it.
#
# Terraform can't create the bucket it stores its own state in (it needs the
# bucket before it can run), so this is the one piece done outside Terraform.
# Safe to run more than once.
set -euo pipefail

REGION="${AWS_REGION:-eu-west-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="unque-tfstate-${ACCOUNT_ID}-${REGION}"
BACKEND_FILE="$(cd "$(dirname "$0")/.." && pwd)/infra/terraform/backend.hcl"

if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "Bucket $BUCKET already exists, re-applying its settings"
else
  echo "Creating $BUCKET in $REGION"
  aws s3api create-bucket \
    --bucket "$BUCKET" \
    --region "$REGION" \
    --create-bucket-configuration "LocationConstraint=$REGION"
fi

# State contains secrets: nothing public, ever
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Keep old versions so a bad write can be rolled back
aws s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Refuse any request that isn't over TLS
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyInsecureTransport",
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": ["arn:aws:s3:::$BUCKET", "arn:aws:s3:::$BUCKET/*"],
    "Condition": { "Bool": { "aws:SecureTransport": "false" } }
  }]
}
EOF
)"

cat > "$BACKEND_FILE" <<EOF
bucket       = "$BUCKET"
key          = "unque/terraform.tfstate"
region       = "$REGION"
use_lockfile = true
encrypt      = true
EOF

echo "Wrote $BACKEND_FILE"
echo "Next: cd infra/terraform && terraform init -backend-config=backend.hcl -migrate-state"