#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
umask 077

container="$(docker compose ps -q app)"
if [[ -z "$container" ]]; then
  echo "应用容器未运行，请先执行 deploy.sh。" >&2
  exit 1
fi

result="$(docker compose exec -T app node server/backup.js)"
printf '%s\n' "$result"
source_file="$(printf '%s\n' "$result" | sed -n 's/^备份完成：//p' | tail -n 1 | tr -d '\r')"
if [[ -z "$source_file" ]]; then
  echo "没有找到备份文件路径。" >&2
  exit 1
fi

mkdir -p "$ROOT/backups"
filename="${source_file##*/}"
docker cp "$container:$source_file" "$ROOT/backups/$filename" >/dev/null
chmod 600 "$ROOT/backups/$filename"
echo "备份已复制到项目目录：$ROOT/backups/$filename"
