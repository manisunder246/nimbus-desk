#!/usr/bin/env bash
# 07-apigateway.sh — REST API in front of nimbusdesk-classifier (Lambda proxy /classify POST).
set -euo pipefail
source "$(dirname "$0")/_common.sh"

API_NAME="nimbusdesk-classifier-api"
STAGE="prod"
RESOURCE_PATH="classify"
FN_NAME="nimbusdesk-classifier"
LAMBDA_ARN="arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${FN_NAME}"

log "Looking up REST API: $API_NAME"
API_ID="$(aws apigateway get-rest-apis --region "$AWS_REGION" \
  --query "items[?name=='${API_NAME}'].id | [0]" --output text)"

if [ "$API_ID" != "None" ] && [ -n "$API_ID" ]; then
  warn "REST API '$API_NAME' already exists ($API_ID); reusing."
else
  log "Creating REST API: $API_NAME"
  API_ID="$(aws apigateway create-rest-api --region "$AWS_REGION" \
    --name "$API_NAME" --endpoint-configuration types=REGIONAL \
    --query 'id' --output text)"
  ok "Created API: $API_ID"
fi

ROOT_ID="$(aws apigateway get-resources --region "$AWS_REGION" --rest-api-id "$API_ID" \
  --query "items[?path=='/'].id | [0]" --output text)"

RESOURCE_ID="$(aws apigateway get-resources --region "$AWS_REGION" --rest-api-id "$API_ID" \
  --query "items[?path=='/${RESOURCE_PATH}'].id | [0]" --output text)"

if [ "$RESOURCE_ID" = "None" ] || [ -z "$RESOURCE_ID" ]; then
  log "Creating resource /${RESOURCE_PATH}"
  RESOURCE_ID="$(aws apigateway create-resource --region "$AWS_REGION" \
    --rest-api-id "$API_ID" --parent-id "$ROOT_ID" --path-part "$RESOURCE_PATH" \
    --query 'id' --output text)"
  ok "Resource created: $RESOURCE_ID"
else
  warn "Resource /${RESOURCE_PATH} already exists ($RESOURCE_ID)"
fi

if aws apigateway get-method --region "$AWS_REGION" --rest-api-id "$API_ID" \
   --resource-id "$RESOURCE_ID" --http-method POST >/dev/null 2>&1; then
  warn "POST method already on /${RESOURCE_PATH}; skipping put-method."
else
  log "Adding POST method"
  aws apigateway put-method --region "$AWS_REGION" --rest-api-id "$API_ID" \
    --resource-id "$RESOURCE_ID" --http-method POST --authorization-type NONE >/dev/null
fi

INTEG_URI="arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations"
log "Wiring Lambda proxy integration"
aws apigateway put-integration --region "$AWS_REGION" --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" --http-method POST \
  --type AWS_PROXY --integration-http-method POST \
  --uri "$INTEG_URI" >/dev/null

STMT_ID="apigw-invoke-classifier"
SOURCE_ARN="arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/POST/${RESOURCE_PATH}"
if aws lambda get-policy --function-name "$FN_NAME" --region "$AWS_REGION" 2>/dev/null \
    | grep -q "$STMT_ID"; then
  warn "Lambda permission '$STMT_ID' already present; skipping."
else
  log "Granting API Gateway invoke permission on Lambda"
  aws lambda add-permission --region "$AWS_REGION" \
    --function-name "$FN_NAME" --statement-id "$STMT_ID" \
    --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
    --source-arn "$SOURCE_ARN" >/dev/null
fi

log "Deploying to stage: $STAGE"
aws apigateway create-deployment --region "$AWS_REGION" --rest-api-id "$API_ID" --stage-name "$STAGE" >/dev/null
ok "Deployed."

INVOKE_URL="https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${STAGE}/${RESOURCE_PATH}"
upsert_env APIGW_REST_API_ID    "$API_ID"
upsert_env APIGW_CLASSIFIER_URL "$INVOKE_URL"

ok "API Gateway provisioning complete."
log "Invoke URL: $INVOKE_URL"
