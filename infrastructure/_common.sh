#!/usr/bin/env bash
# Shared helpers for NimbusDesk infrastructure scripts.
set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-south-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null)}"
if [ -z "${AWS_ACCOUNT_ID:-}" ] || [ "$AWS_ACCOUNT_ID" = "None" ]; then
  echo "AWS_ACCOUNT_ID could not be resolved. Set it in env or run \`aws configure\`." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.infrastructure"

touch "$ENV_FILE"

# upsert_env KEY VALUE  -> sets KEY=VALUE in $ENV_FILE (replacing if present)
upsert_env() {
  local key="$1"; shift
  local value="$*"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    # portable in-place edit (macOS + linux)
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$value" -F= 'BEGIN{OFS="="} { if ($1==k) { print k, v } else { print $0 } }' "$ENV_FILE" > "$tmp"
    mv "$tmp" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

log()  { printf '\033[1;34m[infra]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }
