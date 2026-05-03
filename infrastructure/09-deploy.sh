#!/usr/bin/env bash
# 09-deploy.sh — build frontend, package backend+dist, ship to EC2, install + run.
set -euo pipefail
source "$(dirname "$0")/_common.sh"

KEY_PATH="$SCRIPT_DIR/nimbusdesk-key.pem"
EC2_DNS="$(grep -E '^EC2_PUBLIC_DNS=' "$ENV_FILE" | cut -d= -f2-)"
[ -z "$EC2_DNS" ] && { echo "EC2_PUBLIC_DNS not in $ENV_FILE; run 08-ec2.sh first" >&2; exit 1; }
[ ! -f "$KEY_PATH" ] && { echo "Missing PEM at $KEY_PATH" >&2; exit 1; }

EC2_USER="ec2-user"
REMOTE_HOME="/home/$EC2_USER"
REMOTE_APP="$REMOTE_HOME/nimbusdesk"
TARBALL="$ROOT_DIR/nimbusdesk-deploy.tar.gz"
STAGING="$(mktemp -d)"
SSH_OPTS=(-i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR)

cleanup() { rm -rf "$STAGING"; }
trap cleanup EXIT

log "Building frontend with API base http://${EC2_DNS}/api"
( cd "$ROOT_DIR/frontend" && VITE_API_BASE_URL="http://${EC2_DNS}/api" \
    VITE_COGNITO_USER_POOL_ID="$(grep '^COGNITO_USER_POOL_ID=' "$ENV_FILE" | cut -d= -f2-)" \
    VITE_COGNITO_APP_CLIENT_ID="$(grep '^COGNITO_APP_CLIENT_ID=' "$ENV_FILE" | cut -d= -f2-)" \
    VITE_COGNITO_REGION="${AWS_REGION}" \
    npm run build )
ok "Frontend dist built."

log "Staging payload at $STAGING"
mkdir -p "$STAGING/backend" "$STAGING/frontend"
# backend (no node_modules, no .env)
rsync -a --exclude node_modules --exclude .env "$ROOT_DIR/backend/" "$STAGING/backend/"
# frontend dist only
cp -R "$ROOT_DIR/frontend/dist" "$STAGING/frontend/dist"
# generate backend/.env from .env.infrastructure plus PORT
( echo "PORT=3001"; cat "$ENV_FILE" ) > "$STAGING/backend/.env"

# nginx.conf
cat > "$STAGING/nginx.conf" <<'EOF'
server {
    listen 80 default_server;
    server_name _;

    root /usr/share/nginx/html/nimbusdesk;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10m;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001/health;
    }
}
EOF

# setup.sh — runs once on EC2 to install + start everything (idempotent)
cat > "$STAGING/setup.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

APP=/home/ec2-user/nimbusdesk
cd "$APP"

echo "[setup] Installing system packages (nginx, nodejs20)..."
sudo dnf install -y nginx >/dev/null
# AL2023 default 'nodejs' is v18; jose/jwks-rsa need Node 20+. Install nodejs20 explicitly.
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 20 ]; then
  sudo dnf install -y nodejs20 nodejs20-npm >/dev/null
  sudo alternatives --install /usr/bin/node node /usr/bin/node-20 90 \
    --slave /usr/bin/npm npm /usr/bin/npm-20 \
    --slave /usr/bin/npx npx /usr/bin/npx-20 || true
  sudo alternatives --set node /usr/bin/node-20 || true
fi
echo "[setup] node $(node -v) / npm $(npm -v)"

echo "[setup] Installing backend production deps..."
( cd "$APP/backend" && npm install --omit=dev --silent )

echo "[setup] Configuring nginx..."
# Replace main nginx.conf with a clean base that only loads conf.d/*.conf
sudo tee /etc/nginx/nginx.conf >/dev/null <<'NGX'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;

events { worker_connections 1024; }

http {
    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" "$http_user_agent"';
    access_log  /var/log/nginx/access.log  main;
    sendfile            on;
    keepalive_timeout   65;
    include             /etc/nginx/conf.d/*.conf;
}
NGX
sudo cp "$APP/nginx.conf" /etc/nginx/conf.d/nimbusdesk.conf
sudo rm -f /etc/nginx/conf.d/default.conf

echo "[setup] Publishing frontend dist..."
sudo rm -rf /usr/share/nginx/html/nimbusdesk
sudo mkdir -p /usr/share/nginx/html/nimbusdesk
sudo cp -R "$APP/frontend/dist/." /usr/share/nginx/html/nimbusdesk/

echo "[setup] Validating nginx config..."
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

echo "[setup] Installing pm2 globally (prefix /usr/local)..."
# nodejs20 on AL2023 sets npm prefix to /usr/lib/nodejs20 which produces broken
# /usr/bin symlinks. Pin prefix to /usr/local so binaries land in /usr/local/bin.
sudo npm config set prefix /usr/local --location=global
sudo npm install -g pm2 --silent
# Clean up any stale broken symlinks left behind in /usr/bin from prior installs
for b in pm2 pm2-dev pm2-docker pm2-runtime; do
  [ -L "/usr/bin/$b" ] && [ ! -e "/usr/bin/$b" ] && sudo rm -f "/usr/bin/$b" || true
done
hash -r
echo "[setup] pm2 -> $(which pm2) ($(pm2 --version))"

echo "[setup] Starting backend with pm2..."
pm2 delete nimbusdesk-api >/dev/null 2>&1 || true
cd "$APP/backend"
pm2 start src/server.js --name nimbusdesk-api
pm2 save

# Persist pm2 across reboots (only first run actually installs the service)
PM2_CMD="$(pm2 startup systemd -u ec2-user --hp /home/ec2-user 2>&1 | grep -E '^sudo ' | tail -1 || true)"
if [ -n "$PM2_CMD" ]; then
  echo "[setup] Enabling pm2 systemd unit"
  eval "$PM2_CMD"
fi

echo "[setup] Done."
pm2 status
EOF
chmod +x "$STAGING/setup.sh"

log "Building tarball $TARBALL"
( cd "$STAGING" && tar -czf "$TARBALL" . )
ok "Tarball: $(du -h "$TARBALL" | cut -f1)"

log "Waiting for SSH on $EC2_DNS"
for i in $(seq 1 30); do
  if ssh "${SSH_OPTS[@]}" -o ConnectTimeout=5 "$EC2_USER@$EC2_DNS" 'echo ok' >/dev/null 2>&1; then
    ok "SSH up"
    break
  fi
  sleep 5
  [ "$i" = "30" ] && { echo "SSH never came up" >&2; exit 1; }
done

log "Copying tarball to EC2"
scp "${SSH_OPTS[@]}" "$TARBALL" "$EC2_USER@$EC2_DNS:$REMOTE_HOME/nimbusdesk-deploy.tar.gz"

log "Extracting + running setup on EC2"
ssh "${SSH_OPTS[@]}" "$EC2_USER@$EC2_DNS" bash -s <<EOF
set -e
rm -rf $REMOTE_APP
mkdir -p $REMOTE_APP
tar -xzf $REMOTE_HOME/nimbusdesk-deploy.tar.gz -C $REMOTE_APP
bash $REMOTE_APP/setup.sh
EOF

ok "Deploy complete."

log "Smoke testing public endpoint..."
sleep 2
curl -s -o /dev/null -w "  HTTP %{http_code}  /health\n" "http://${EC2_DNS}/health" || true
curl -s -o /dev/null -w "  HTTP %{http_code}  /\n" "http://${EC2_DNS}/" || true

cat <<MSG

================================================================
NIMBUSDESK LIVE — http://${EC2_DNS}
----------------------------------------------------------------
  Admin login: <admin email> / <admin password>
  User  login: <user email>  / <user password>
  (use the seed credentials you provisioned via 01-cognito.sh)

  SSH:  ssh -i infrastructure/nimbusdesk-key.pem ec2-user@${EC2_DNS}
  Logs: pm2 logs nimbusdesk-api
================================================================
MSG
