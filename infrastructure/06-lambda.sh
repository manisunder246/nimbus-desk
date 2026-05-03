#!/usr/bin/env bash
# 06-lambda.sh — package and deploy nimbusdesk-classifier Lambda.
set -euo pipefail
source "$(dirname "$0")/_common.sh"

FN_NAME="nimbusdesk-classifier"
LAMBDA_DIR="$ROOT_DIR/lambda"
ZIP_PATH="$LAMBDA_DIR/function.zip"

# Pull required values from .env.infrastructure
LAMBDA_ROLE_ARN="$(grep -E '^IAM_LAMBDA_ROLE_ARN=' "$ENV_FILE" | cut -d= -f2-)"
TICKETS_TABLE="$(grep -E '^DYNAMODB_TICKETS_TABLE=' "$ENV_FILE" | cut -d= -f2-)"
SNS_TOPIC_ARN="$(grep -E '^SNS_NOTIFICATIONS_TOPIC_ARN=' "$ENV_FILE" | cut -d= -f2-)"

if [ -z "$LAMBDA_ROLE_ARN" ] || [ -z "$TICKETS_TABLE" ] || [ -z "$SNS_TOPIC_ARN" ]; then
  echo "Missing one of: IAM_LAMBDA_ROLE_ARN, DYNAMODB_TICKETS_TABLE, SNS_NOTIFICATIONS_TOPIC_ARN in $ENV_FILE" >&2
  exit 1
fi

ENV_VARS="Variables={TICKETS_TABLE=${TICKETS_TABLE},SNS_TOPIC_ARN=${SNS_TOPIC_ARN},AWS_REGION_NAME=${AWS_REGION}}"

log "Installing production deps in lambda/"
( cd "$LAMBDA_DIR" && npm install --omit=dev --silent )

log "Building deployment zip: $ZIP_PATH"
rm -f "$ZIP_PATH"
( cd "$LAMBDA_DIR" && zip -qr "$ZIP_PATH" index.js package.json node_modules )
ok "Zip built ($(du -h "$ZIP_PATH" | cut -f1))"

if aws lambda get-function --function-name "$FN_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  log "Function $FN_NAME exists; updating code + configuration"
  aws lambda update-function-code \
    --function-name "$FN_NAME" \
    --zip-file "fileb://$ZIP_PATH" \
    --region "$AWS_REGION" >/dev/null
  log "Waiting for code-update to finish..."
  aws lambda wait function-updated --function-name "$FN_NAME" --region "$AWS_REGION"
  aws lambda update-function-configuration \
    --function-name "$FN_NAME" \
    --runtime nodejs20.x \
    --handler index.handler \
    --timeout 15 \
    --memory-size 256 \
    --role "$LAMBDA_ROLE_ARN" \
    --environment "$ENV_VARS" \
    --region "$AWS_REGION" >/dev/null
  aws lambda wait function-updated --function-name "$FN_NAME" --region "$AWS_REGION"
  ok "Updated $FN_NAME"
else
  log "Creating function $FN_NAME"
  # IAM role can take a few seconds to propagate after creation; retry up to 6 times.
  for attempt in 1 2 3 4 5 6; do
    if aws lambda create-function \
        --function-name "$FN_NAME" \
        --runtime nodejs20.x \
        --handler index.handler \
        --timeout 15 \
        --memory-size 256 \
        --role "$LAMBDA_ROLE_ARN" \
        --zip-file "fileb://$ZIP_PATH" \
        --environment "$ENV_VARS" \
        --region "$AWS_REGION" >/dev/null 2>/tmp/lambda-create.err; then
      ok "Created $FN_NAME"
      break
    fi
    if grep -q "cannot be assumed" /tmp/lambda-create.err; then
      warn "IAM role not yet assumable (attempt $attempt); sleeping 5s"
      sleep 5
    else
      cat /tmp/lambda-create.err >&2
      exit 1
    fi
  done
fi

LAMBDA_ARN="$(aws lambda get-function --function-name "$FN_NAME" --region "$AWS_REGION" \
  --query 'Configuration.FunctionArn' --output text)"

upsert_env LAMBDA_CLASSIFIER_NAME "$FN_NAME"
upsert_env LAMBDA_CLASSIFIER_ARN  "$LAMBDA_ARN"

ok "Lambda deploy complete: $LAMBDA_ARN"
