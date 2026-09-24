#!/usr/bin/env bash
# Ужимает скриншоты документации (палитра 256 цветов): в репозитории они в разы легче.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v convert >/dev/null || { echo "ImageMagick не найден — скриншоты не сжаты"; exit 0; }
for f in docs/screenshots/*/*.png; do
  convert "$f" -strip -colors 256 "PNG8:$f.tmp" && mv "$f.tmp" "$f"
done
du -sh docs/screenshots
