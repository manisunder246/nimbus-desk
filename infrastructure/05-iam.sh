#!/usr/bin/env bash
# 05-iam.sh — provision NimbusDesk EC2 + Lambda IAM roles, policies, instance profile.
set -euo pipefail
source "$(dirname "$0")/_common.sh"

EC2_ROLE="nimbusdesk-ec2-role"
EC2_PROFILE="nimbusdesk-ec2-instance-profile"
LAMBDA_ROLE="nimbusdesk-lambda-role"

TICKETS_TABLE="nimbusdesk-tickets"
USERS_TABLE="nimbusdesk-users"
S3_BUCKET="nimbusdesk-attachments-${AWS_ACCOUNT_ID}"
SNS_TOPIC_ARN="arn:aws:sns:${AWS_REGION}:${AWS_ACCOUNT_ID}:nimbusdesk-notifications"
LAMBDA_NAME="nimbusdesk-classifier"

# Pull pool ID from .env.infrastructure if available
POOL_ID="$(grep -E '^COGNITO_USER_POOL_ID=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || true)"
if [ -z "$POOL_ID" ]; then
  warn "COGNITO_USER_POOL_ID not found in $ENV_FILE; cognito policy will use wildcard pool ARN"
  POOL_ARN="arn:aws:cognito-idp:${AWS_REGION}:${AWS_ACCOUNT_ID}:userpool/*"
else
  POOL_ARN="arn:aws:cognito-idp:${AWS_REGION}:${AWS_ACCOUNT_ID}:userpool/${POOL_ID}"
fi

EC2_TRUST='{
  "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]
}'

LAMBDA_TRUST='{
  "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]
}'

EC2_POLICY=$(cat <<JSON
{
  "Version":"2012-10-17",
  "Statement":[
    {
      "Sid":"DynamoDBAccess",
      "Effect":"Allow",
      "Action":"dynamodb:*",
      "Resource":[
        "arn:aws:dynamodb:${AWS_REGION}:${AWS_ACCOUNT_ID}:table/${TICKETS_TABLE}",
        "arn:aws:dynamodb:${AWS_REGION}:${AWS_ACCOUNT_ID}:table/${TICKETS_TABLE}/index/*",
        "arn:aws:dynamodb:${AWS_REGION}:${AWS_ACCOUNT_ID}:table/${USERS_TABLE}",
        "arn:aws:dynamodb:${AWS_REGION}:${AWS_ACCOUNT_ID}:table/${USERS_TABLE}/index/*"
      ]
    },
    {
      "Sid":"S3ObjectAccess",
      "Effect":"Allow",
      "Action":["s3:GetObject","s3:PutObject","s3:DeleteObject"],
      "Resource":"arn:aws:s3:::${S3_BUCKET}/*"
    },
    {
      "Sid":"S3ListBucket",
      "Effect":"Allow",
      "Action":["s3:ListBucket"],
      "Resource":"arn:aws:s3:::${S3_BUCKET}"
    },
    {
      "Sid":"SNSPublish",
      "Effect":"Allow",
      "Action":"sns:Publish",
      "Resource":"${SNS_TOPIC_ARN}"
    },
    {
      "Sid":"LambdaInvoke",
      "Effect":"Allow",
      "Action":"lambda:InvokeFunction",
      "Resource":"arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${LAMBDA_NAME}"
    },
    {
      "Sid":"CognitoRead",
      "Effect":"Allow",
      "Action":[
        "cognito-idp:AdminListGroupsForUser",
        "cognito-idp:ListUsers",
        "cognito-idp:ListUsersInGroup"
      ],
      "Resource":"${POOL_ARN}"
    },
    {
      "Sid":"CloudWatchLogs",
      "Effect":"Allow",
      "Action":["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
      "Resource":"*"
    }
  ]
}
JSON
)

LAMBDA_POLICY=$(cat <<JSON
{
  "Version":"2012-10-17",
  "Statement":[
    {
      "Sid":"TicketsTableRW",
      "Effect":"Allow",
      "Action":["dynamodb:UpdateItem","dynamodb:GetItem"],
      "Resource":"arn:aws:dynamodb:${AWS_REGION}:${AWS_ACCOUNT_ID}:table/${TICKETS_TABLE}"
    },
    {
      "Sid":"SNSPublish",
      "Effect":"Allow",
      "Action":"sns:Publish",
      "Resource":"${SNS_TOPIC_ARN}"
    }
  ]
}
JSON
)

ensure_role() {
  local name="$1"; local trust="$2"
  if aws iam get-role --role-name "$name" >/dev/null 2>&1; then
    warn "Role $name already exists; skipping create."
  else
    log "Creating role: $name"
    aws iam create-role --role-name "$name" --assume-role-policy-document "$trust" >/dev/null
    ok "Created role: $name"
  fi
}

ensure_role "$EC2_ROLE"    "$EC2_TRUST"
ensure_role "$LAMBDA_ROLE" "$LAMBDA_TRUST"

log "Attaching inline policy to $EC2_ROLE"
aws iam put-role-policy --role-name "$EC2_ROLE" --policy-name "nimbusdesk-ec2-inline" --policy-document "$EC2_POLICY"

log "Attaching inline policy to $LAMBDA_ROLE"
aws iam put-role-policy --role-name "$LAMBDA_ROLE" --policy-name "nimbusdesk-lambda-inline" --policy-document "$LAMBDA_POLICY"

log "Attaching AWSLambdaBasicExecutionRole managed policy to $LAMBDA_ROLE"
aws iam attach-role-policy --role-name "$LAMBDA_ROLE" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

if aws iam get-instance-profile --instance-profile-name "$EC2_PROFILE" >/dev/null 2>&1; then
  warn "Instance profile $EC2_PROFILE already exists; skipping create."
else
  log "Creating instance profile: $EC2_PROFILE"
  aws iam create-instance-profile --instance-profile-name "$EC2_PROFILE" >/dev/null
fi

CURRENT_PROFILE_ROLE="$(aws iam get-instance-profile --instance-profile-name "$EC2_PROFILE" \
  --query 'InstanceProfile.Roles[0].RoleName' --output text 2>/dev/null || echo "None")"

if [ "$CURRENT_PROFILE_ROLE" = "$EC2_ROLE" ]; then
  warn "Role $EC2_ROLE already attached to $EC2_PROFILE; skipping."
else
  if [ "$CURRENT_PROFILE_ROLE" != "None" ] && [ -n "$CURRENT_PROFILE_ROLE" ]; then
    warn "Removing previously attached role $CURRENT_PROFILE_ROLE from profile"
    aws iam remove-role-from-instance-profile --instance-profile-name "$EC2_PROFILE" --role-name "$CURRENT_PROFILE_ROLE"
  fi
  log "Adding $EC2_ROLE to $EC2_PROFILE"
  aws iam add-role-to-instance-profile --instance-profile-name "$EC2_PROFILE" --role-name "$EC2_ROLE"
fi

LAMBDA_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${LAMBDA_ROLE}"
EC2_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${EC2_ROLE}"

upsert_env IAM_EC2_ROLE_NAME        "$EC2_ROLE"
upsert_env IAM_EC2_ROLE_ARN         "$EC2_ROLE_ARN"
upsert_env IAM_EC2_INSTANCE_PROFILE "$EC2_PROFILE"
upsert_env IAM_LAMBDA_ROLE_ARN      "$LAMBDA_ROLE_ARN"

ok "IAM provisioning complete."
