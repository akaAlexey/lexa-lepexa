#!/usr/bin/env bash
# Проверка живого API без изменения данных: /health, все GET контракта со счётчиками, поток уведомлений.
#   bash docs/ops/smoke.sh https://api.marshrutypobedy.ru
# Ожидаемо (демо-сид): routes 1 (точек 4), teams 5, sites ≥3, fundraisers 3, trips 2,
# stories 3, memorials 84, live-photos 2.
set -u
ROOT="${1:-http://127.0.0.1:8000}"
ROOT="${ROOT%/}"
API="$ROOT/api/v1"

echo "health: $(curl -s -m 10 "$ROOT/health")"
for p in graves memorials battles teams routes requests fundraisers trips group-applications stories live-photos sites; do
  body=$(curl -s -m 15 -w '\n%{http_code}' "$API/$p")
  code=${body##*$'\n'}
  n=$(printf '%s' "${body%$'\n'*}" | python3 -c 'import sys,json
try:
  d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else "obj")
except Exception: print("?")')
  printf '%-20s %s  count=%s\n' "$p" "$code" "$n"
done
printf '%-20s %s\n' "stats/search" "$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$API/stats/search")"
rid=$(curl -s -m 10 "$API/routes" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"] if d else "")')
[ -n "$rid" ] && echo "route $rid points: $(curl -s -m 10 "$API/routes/$rid" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d.get("points") or d.get("stops") or []))')"

echo "--- SSE 5 c (события должны разделяться пустой строкой):"
curl -s -N -m 5 -H 'Accept: text/event-stream' "$API/notifications/stream?user=test" | head -c 600
echo
echo "--- CORS для Pages:"
curl -s -m 10 -o /dev/null -D - -H 'Origin: https://team-shpilit.github.io' "$API/teams" | grep -i '^access-control-allow-origin' || echo "нет заголовка CORS"
