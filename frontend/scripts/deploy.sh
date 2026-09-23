#!/usr/bin/env bash
# Деплой статической сборки на сервер с Caddy (ADR 0002).
# Использование: DEPLOY_TARGET=user@host:/var/www/tropa npm run deploy
# На сервере — deploy/Caddyfile: HTTPS, fallback на index.html, прокси /api на бэкенд.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${DEPLOY_TARGET:?Укажите DEPLOY_TARGET=user@host:/путь}"

npm run build
rsync -az --delete dist/ "$DEPLOY_TARGET/"
echo "Готово: $DEPLOY_TARGET"
