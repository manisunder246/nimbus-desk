#!/usr/bin/env bash
# 01-cognito.sh — provision Cognito User Pool, App Client, Groups, seed users.
set -euo pipefail
source "$(dirname "$0")/_common.sh"

POOL_NAME="nimbusdesk-user-pool"
CLIENT_NAME="nimbusdesk-web-client"
ADMIN_EMAIL="${COGNITO_SEED_ADMIN_EMAIL:-admin@example.com}"
USER_EMAIL="${COGNITO_SEED_USER_EMAIL:-user@example.com}"
# Temporary password — Cognito will force users to change it on first login.
TEMP_PASSWORD="${COGNITO_SEED_TEMP_PASSWORD:-ChangeMeOnFirstLogin#1}"

log "Looking up existing user pool by name: $POOL_NAME"
POOL_ID="$(aws cognito-idp list-user-pools --max-results 60 --region "$AWS_REGION" \
  --query "UserPools[?Name=='${POOL_NAME}'].Id | [0]" --output text)"

if [ "$POOL_ID" != "None" ] && [ -n "$POOL_ID" ]; then
  warn "User pool '$POOL_NAME' already exists ($POOL_ID); skipping creation."
else
  log "Creating user pool: $POOL_NAME"
  POOL_ID="$(aws cognito-idp create-user-pool \
    --region "$AWS_REGION" \
    --pool-name "$POOL_NAME" \
    --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false}}' \
    --auto-verified-attributes email \
    --username-attributes email \
    --schema '[{"Name":"role","AttributeDataType":"String","Required":false,"Mutable":true}]' \
    --query 'UserPool.Id' --output text)"
  ok "Created user pool: $POOL_ID"
fi

log "Looking up app client: $CLIENT_NAME"
CLIENT_ID="$(aws cognito-idp list-user-pool-clients --user-pool-id "$POOL_ID" --region "$AWS_REGION" \
  --query "UserPoolClients[?ClientName=='${CLIENT_NAME}'].ClientId | [0]" --output text)"

if [ "$CLIENT_ID" != "None" ] && [ -n "$CLIENT_ID" ]; then
  warn "App client '$CLIENT_NAME' already exists ($CLIENT_ID); skipping."
else
  log "Creating app client: $CLIENT_NAME"
  CLIENT_ID="$(aws cognito-idp create-user-pool-client \
    --region "$AWS_REGION" \
    --user-pool-id "$POOL_ID" \
    --client-name "$CLIENT_NAME" \
    --no-generate-secret \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --query 'UserPoolClient.ClientId' --output text)"
  ok "Created app client: $CLIENT_ID"
fi

for grp in Admins Users; do
  if aws cognito-idp get-group --user-pool-id "$POOL_ID" --group-name "$grp" --region "$AWS_REGION" >/dev/null 2>&1; then
    warn "Group '$grp' already exists; skipping."
  else
    log "Creating group: $grp"
    aws cognito-idp create-group --user-pool-id "$POOL_ID" --group-name "$grp" --region "$AWS_REGION" >/dev/null
    ok "Created group: $grp"
  fi
done

create_seed_user() {
  local email="$1"; local group="$2"
  if aws cognito-idp admin-get-user --user-pool-id "$POOL_ID" --username "$email" --region "$AWS_REGION" >/dev/null 2>&1; then
    warn "Seed user '$email' already exists; skipping."
  else
    log "Creating seed user: $email"
    aws cognito-idp admin-create-user \
      --region "$AWS_REGION" \
      --user-pool-id "$POOL_ID" \
      --username "$email" \
      --temporary-password "$TEMP_PASSWORD" \
      --user-attributes Name=email,Value="$email" Name=email_verified,Value=true Name=custom:role,Value="$group" \
      --message-action SUPPRESS >/dev/null
    ok "Created seed user: $email (temp password: $TEMP_PASSWORD)"
  fi
  log "Ensuring '$email' is in group '$group'"
  aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$email" --group-name "$group" --region "$AWS_REGION" >/dev/null || true
}

create_seed_user "$ADMIN_EMAIL" "Admins"
create_seed_user "$USER_EMAIL"  "Users"

upsert_env COGNITO_USER_POOL_ID   "$POOL_ID"
upsert_env COGNITO_APP_CLIENT_ID  "$CLIENT_ID"
upsert_env COGNITO_REGION         "$AWS_REGION"

ok "Cognito provisioning complete."
log "Wrote keys to $ENV_FILE"
