#!/usr/bin/env bash
# 08-ec2.sh — provision security group, key pair, EC2 instance for NimbusDesk app.
set -euo pipefail
source "$(dirname "$0")/_common.sh"

SG_NAME="nimbusdesk-sg"
KEY_NAME="nimbusdesk-key"
KEY_PATH="$SCRIPT_DIR/${KEY_NAME}.pem"
INSTANCE_PROFILE="nimbusdesk-ec2-instance-profile"
INSTANCE_TAG="nimbusdesk-app"
INSTANCE_TYPE="t2.micro"
SSM_AMI_PARAM="/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"

log "Locating default VPC"
VPC_ID="$(aws ec2 describe-vpcs --region "$AWS_REGION" \
  --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)"
[ "$VPC_ID" = "None" ] && { echo "No default VPC in $AWS_REGION" >&2; exit 1; }
ok "Default VPC: $VPC_ID"

log "Ensuring security group: $SG_NAME"
SG_ID="$(aws ec2 describe-security-groups --region "$AWS_REGION" \
  --filters Name=group-name,Values="$SG_NAME" Name=vpc-id,Values="$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo None)"

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID="$(aws ec2 create-security-group --region "$AWS_REGION" \
    --group-name "$SG_NAME" --description "NimbusDesk app SG (HTTP/HTTPS/SSH)" \
    --vpc-id "$VPC_ID" --query 'GroupId' --output text)"
  ok "Created SG: $SG_ID"
else
  warn "SG already exists: $SG_ID"
fi

ensure_ingress() {
  local port="$1"
  if aws ec2 describe-security-groups --region "$AWS_REGION" --group-ids "$SG_ID" \
      --query "SecurityGroups[0].IpPermissions[?FromPort==\`${port}\`]" --output text | grep -q .; then
    warn "Ingress :$port already allowed"
  else
    log "Adding ingress :$port from 0.0.0.0/0"
    aws ec2 authorize-security-group-ingress --region "$AWS_REGION" \
      --group-id "$SG_ID" --protocol tcp --port "$port" --cidr 0.0.0.0/0 >/dev/null
  fi
}
ensure_ingress 22
ensure_ingress 80
ensure_ingress 443

log "Ensuring key pair: $KEY_NAME"
if aws ec2 describe-key-pairs --region "$AWS_REGION" --key-names "$KEY_NAME" >/dev/null 2>&1; then
  warn "Key pair $KEY_NAME already exists in AWS."
  if [ ! -f "$KEY_PATH" ]; then
    echo "ERROR: AWS has key pair $KEY_NAME but local PEM is missing at $KEY_PATH." >&2
    echo "Either copy the original PEM there, or delete the key pair from AWS to regenerate." >&2
    exit 1
  fi
else
  log "Creating key pair and saving PEM to $KEY_PATH"
  aws ec2 create-key-pair --region "$AWS_REGION" --key-name "$KEY_NAME" \
    --query 'KeyMaterial' --output text > "$KEY_PATH"
  chmod 400 "$KEY_PATH"
  ok "Wrote $KEY_PATH"
fi

log "Resolving latest AL2023 AMI via SSM"
AMI_ID="$(aws ssm get-parameter --region "$AWS_REGION" --name "$SSM_AMI_PARAM" \
  --query 'Parameter.Value' --output text)"
ok "AMI: $AMI_ID"

log "Checking for existing tagged instance"
EXISTING="$(aws ec2 describe-instances --region "$AWS_REGION" \
  --filters Name=tag:Name,Values="$INSTANCE_TAG" Name=instance-state-name,Values=pending,running,stopped,stopping \
  --query 'Reservations[].Instances[0].InstanceId' --output text)"

if [ -n "$EXISTING" ] && [ "$EXISTING" != "None" ]; then
  warn "Instance with tag Name=$INSTANCE_TAG already exists: $EXISTING; reusing."
  INSTANCE_ID="$EXISTING"
else
  log "Launching $INSTANCE_TYPE instance"
  INSTANCE_ID="$(aws ec2 run-instances --region "$AWS_REGION" \
    --image-id "$AMI_ID" --instance-type "$INSTANCE_TYPE" --count 1 \
    --key-name "$KEY_NAME" --security-group-ids "$SG_ID" \
    --iam-instance-profile Name="$INSTANCE_PROFILE" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_TAG}]" \
    --query 'Instances[0].InstanceId' --output text)"
  ok "Launched: $INSTANCE_ID"
fi

log "Waiting for $INSTANCE_ID to reach 'running'..."
aws ec2 wait instance-running --region "$AWS_REGION" --instance-ids "$INSTANCE_ID"

DESCRIBE="$(aws ec2 describe-instances --region "$AWS_REGION" --instance-ids "$INSTANCE_ID" --output json)"
PUBLIC_DNS="$(echo "$DESCRIBE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["Reservations"][0]["Instances"][0]["PublicDnsName"])')"
PUBLIC_IP="$(echo "$DESCRIBE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["Reservations"][0]["Instances"][0]["PublicIpAddress"])')"

ok "Public DNS: $PUBLIC_DNS"
ok "Public IP : $PUBLIC_IP"

upsert_env EC2_SECURITY_GROUP_ID "$SG_ID"
upsert_env EC2_KEY_PAIR_NAME     "$KEY_NAME"
upsert_env EC2_INSTANCE_ID       "$INSTANCE_ID"
upsert_env EC2_PUBLIC_DNS        "$PUBLIC_DNS"
upsert_env EC2_PUBLIC_IP         "$PUBLIC_IP"

ok "EC2 provisioning complete."
