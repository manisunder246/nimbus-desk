#!/usr/bin/env bash
# 03-s3.sh — provision the NimbusDesk attachments bucket.
set -euo pipefail
source "$(dirname "$0")/_common.sh"

BUCKET="nimbusdesk-attachments-${AWS_ACCOUNT_ID}"

if aws s3api head-bucket --bucket "$BUCKET" --region "$AWS_REGION" >/dev/null 2>&1; then
  warn "Bucket $BUCKET already exists; skipping create."
else
  log "Creating bucket: $BUCKET in $AWS_REGION"
  aws s3api create-bucket \
    --bucket "$BUCKET" \
    --region "$AWS_REGION" \
    --create-bucket-configuration LocationConstraint="$AWS_REGION" >/dev/null
  ok "Bucket created."
fi

log "Enabling block-all-public-access"
aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" >/dev/null

log "Setting default SSE-S3 (AES256) encryption"
aws s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}' >/dev/null

log "Applying CORS configuration"
aws s3api put-bucket-cors \
  --bucket "$BUCKET" \
  --cors-configuration '{
    "CORSRules":[{
      "AllowedMethods":["PUT","GET","POST"],
      "AllowedOrigins":["*"],
      "AllowedHeaders":["*"],
      "ExposeHeaders":["ETag"],
      "MaxAgeSeconds":3000
    }]
  }' >/dev/null

upsert_env S3_ATTACHMENTS_BUCKET "$BUCKET"
ok "S3 provisioning complete."
