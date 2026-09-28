#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

DOMAIN="${1:-}"
if [[ ! "$DOMAIN" =~ ^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$ ]]; then
  echo "用法: sudo bash deploy.sh your-domain.example" >&2
  echo "请先把域名的 DNS A 记录指向这台 VPS。" >&2
  exit 2
fi

command -v docker >/dev/null || { echo "未找到 Docker，请先安装 Docker Engine 和 Compose 插件。" >&2; exit 1; }
command -v openssl >/dev/null || { echo "未找到 openssl，无法生成安全 PIN。" >&2; exit 1; }
docker compose version >/dev/null
docker info >/dev/null 2>&1 || { echo "无法连接 Docker；请用 sudo 运行此脚本，或检查 Docker 权限。" >&2; exit 1; }

umask 077
touch .env
chmod 600 .env

set_env() {
  local key="$1" value="$2" temp
  temp="$(mktemp "$ROOT/.env.XXXXXX")"
  awk -v key="$key" -v value="$value" '
    BEGIN { prefix = key "="; found = 0 }
    index($0, prefix) == 1 {
      if (!found) print prefix value
      found = 1
      next
    }
    { print }
    END { if (!found) print prefix value }
  ' .env > "$temp"
  chmod 600 "$temp"
  mv "$temp" .env
}

read_env() {
  local key="$1"
  awk -v key="$key" 'index($0, key "=") == 1 { sub(/^[^=]*=/, ""); print; exit }' .env
}

set_env DOMAIN "$DOMAIN"
new_credentials=0
for key in APP_PIN ADMIN_PIN; do
  value="$(read_env "$key")"
  if [[ ! "$value" =~ ^[A-Za-z0-9_-]{6,128}$ || "$value" == CHANGE_ME* ]]; then
    value="$(openssl rand -hex 8 | tr 'abcdef' '012345')"
    set_env "$key" "$value"
    new_credentials=1
  fi
done

docker compose config --quiet
docker compose up -d --build

echo
echo "Le Weilai 已启动。域名: https://$DOMAIN"
echo "检查状态: docker compose ps"
echo "查看日志: docker compose logs -f app caddy"
echo "数据库位于持久化卷 restaurant_data；重新部署不会清空订单。"
if (( new_credentials )); then
  echo
  echo "首次生成的登录 PIN（请安全保存）："
  printf '员工 PIN: %s\n' "$(read_env APP_PIN)"
  printf '管理员 PIN: %s\n' "$(read_env ADMIN_PIN)"
  echo "PIN 也保存在权限为 600 的 .env 文件中。"
fi
