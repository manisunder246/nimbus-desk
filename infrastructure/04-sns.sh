#!/usr/bin/env bash
# 04-sns.sh — provision the NimbusDesk SNS topic and email subscription.
set -euo pipefail
source "$(dirname "$0")/_common.sh"

TOPIC_NAME="nimbusdesk-notifications"
SUB_EMAIL="${SNS_SUBSCRIBE_EMAIL:-mani@nimbusdesk.local}"

log "Creating (or fetching) topic: $TOPIC_NAME"
TOPIC_ARN="$(aws sns create-topic --name "$TOPIC_NAME" --region "$AWS_REGION" --query 'TopicArn' --output text)"
ok "Topic ARN: $TOPIC_ARN"

EXISTING_SUB="$(aws sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN" --region "$AWS_REGION" \
  --query "Subscriptions[?Endpoint=='${SUB_EMAIL}'].SubscriptionArn | [0]" --output text)"

if [ "$EXISTING_SUB" != "None" ] && [ -n "$EXISTING_SUB" ]; then
  warn "Email subscription for $SUB_EMAIL already present (ARN=$EXISTING_SUB); skipping."
else
  log "Subscribing email endpoint: $SUB_EMAIL"
  aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol email --notification-endpoint "$SUB_EMAIL" --region "$AWS_REGION" >/dev/null
  warn ">>> ACTION REQUIRED: confirm the SNS email subscription sent to $SUB_EMAIL <<<"
  warn ">>> Subscription will stay 'PendingConfirmation' until you click the AWS confirmation link. <<<"
fi

upsert_env SNS_NOTIFICATIONS_TOPIC_ARN "$TOPIC_ARN"
upsert_env SNS_SUBSCRIBE_EMAIL          "$SUB_EMAIL"

ok "SNS provisioning complete."
