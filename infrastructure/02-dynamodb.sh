#!/usr/bin/env bash
# 02-dynamodb.sh — provision NimbusDesk DynamoDB tables.
set -euo pipefail
source "$(dirname "$0")/_common.sh"

TICKETS_TABLE="nimbusdesk-tickets"
USERS_TABLE="nimbusdesk-users"

ensure_active() {
  local table="$1"
  log "Waiting for $table to become ACTIVE..."
  aws dynamodb wait table-exists --table-name "$table" --region "$AWS_REGION"
  ok "$table is ACTIVE."
}

if aws dynamodb describe-table --table-name "$TICKETS_TABLE" --region "$AWS_REGION" >/dev/null 2>&1; then
  warn "Table $TICKETS_TABLE already exists; skipping creation."
else
  log "Creating table: $TICKETS_TABLE"
  aws dynamodb create-table \
    --region "$AWS_REGION" \
    --table-name "$TICKETS_TABLE" \
    --billing-mode PAY_PER_REQUEST \
    --attribute-definitions \
        AttributeName=ticketId,AttributeType=S \
        AttributeName=createdBy,AttributeType=S \
        AttributeName=createdAt,AttributeType=S \
        AttributeName=status,AttributeType=S \
    --key-schema AttributeName=ticketId,KeyType=HASH \
    --global-secondary-indexes '[
      {
        "IndexName":"createdBy-createdAt-index",
        "KeySchema":[
          {"AttributeName":"createdBy","KeyType":"HASH"},
          {"AttributeName":"createdAt","KeyType":"RANGE"}
        ],
        "Projection":{"ProjectionType":"ALL"}
      },
      {
        "IndexName":"status-createdAt-index",
        "KeySchema":[
          {"AttributeName":"status","KeyType":"HASH"},
          {"AttributeName":"createdAt","KeyType":"RANGE"}
        ],
        "Projection":{"ProjectionType":"ALL"}
      }
    ]' \
    --sse-specification Enabled=true,SSEType=KMS,KMSMasterKeyId=alias/aws/dynamodb \
    >/dev/null
  ok "Create request submitted for $TICKETS_TABLE."
fi

if aws dynamodb describe-table --table-name "$USERS_TABLE" --region "$AWS_REGION" >/dev/null 2>&1; then
  warn "Table $USERS_TABLE already exists; skipping creation."
else
  log "Creating table: $USERS_TABLE"
  aws dynamodb create-table \
    --region "$AWS_REGION" \
    --table-name "$USERS_TABLE" \
    --billing-mode PAY_PER_REQUEST \
    --attribute-definitions AttributeName=userId,AttributeType=S \
    --key-schema AttributeName=userId,KeyType=HASH \
    --sse-specification Enabled=true,SSEType=KMS,KMSMasterKeyId=alias/aws/dynamodb \
    >/dev/null
  ok "Create request submitted for $USERS_TABLE."
fi

ensure_active "$TICKETS_TABLE"
ensure_active "$USERS_TABLE"

upsert_env DYNAMODB_TICKETS_TABLE "$TICKETS_TABLE"
upsert_env DYNAMODB_USERS_TABLE   "$USERS_TABLE"

ok "DynamoDB provisioning complete."
