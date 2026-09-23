#!/usr/bin/env bash
# Временный HTTPS-адрес для проверки на телефоне, пока нет хостинга (ADR 0002).
# Собирает приложение, поднимает vite preview и пробрасывает его через localhost.run (ssh, без установки).
# Ссылка вида https://<случайное>.lhr.life живёт, пока открыт этот процесс. Остановить: Ctrl+C.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${TUNNEL_PORT:-4300}" # не 4173: тот порт занимает e2e-сборка Playwright

npm run build
npx vite preview --port "$PORT" --strictPort &
PREVIEW_PID=$!
trap 'kill "$PREVIEW_PID" 2>/dev/null || true' EXIT

for _ in $(seq 30); do
  curl -s -m 2 -o /dev/null "http://localhost:$PORT/" && break
  sleep 1
done

ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes \
  -R "80:localhost:$PORT" nokey@localhost.run
