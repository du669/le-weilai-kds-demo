#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

DOMAIN="${1:-}"
APP_BASE_PATH="/restaurant"
if [[ ! "$DOMAIN" =~ ^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$ ]]; then
  echo "用法: sudo bash deploy-nginx.sh your-domain.example" >&2
  exit 2
fi
command -v nginx >/dev/null || { echo "未找到 Nginx。" >&2; exit 1; }
command -v python3 >/dev/null || { echo "未找到 Python 3。" >&2; exit 1; }
systemctl is-active --quiet nginx || { echo "Nginx 未运行。" >&2; exit 1; }
[[ -r "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]] || {
  echo "未找到 $DOMAIN 的 HTTPS 证书；请先为该域名配置证书。" >&2
  exit 1
}

CI=true PROXY_MODE=nginx APP_BASE_PATH="$APP_BASE_PATH" bash "$ROOT/deploy.sh" "$DOMAIN"
python3 "$ROOT/deploy/configure-nginx.py" "$DOMAIN" "$APP_BASE_PATH"
nginx -t
systemctl reload nginx
curl -fsS --max-time 8 "https://$DOMAIN$APP_BASE_PATH/api/health" >/dev/null
echo "Le Weilai 已部署到 https://$DOMAIN$APP_BASE_PATH/。"
