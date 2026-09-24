# Тропа памяти: Последний бой — фронтенд

Веб-приложение (mobile-first, телефон и ноутбук) к кейсу хакатона «Маршруты победы»: семейные квест-маршруты по местам боёв Орловской области, штаб поисковых отрядов и карта «Последний бой». Android — следующая фаза из той же кодовой базы.

> **Статус: реализация и доработки по аудиту ТЗ.** Что сделано и чего нет — в [реестре функций](docs/FEATURES.md) и корневом [README](../README.md). Поведение описано тестами: [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md). `npm run verify` зелёный.

## Быстрый старт

```bash
cd frontend
npm ci
npx playwright install chromium   # один раз, для e2e
npm run dev                       # http://localhost:5173
npm run verify                    # typecheck + lint + format + unit + компонентные + e2e (телефон и ноутбук)
```

Проверка на телефоне по HTTPS без хостинга: `npm run tunnel` → ссылка `https://*.lhr.life`.

## Режимы

| Переменная             | Значения                                                                        | По умолчанию  |
| ---------------------- | ------------------------------------------------------------------------------- | ------------- |
| `VITE_API_MODE`        | `mock` — фикстуры; `live` — реальный сервер                                     | `mock`        |
| `VITE_API_URL`         | базовый URL API (HTTPS), обязателен для `live`                                  | —             |
| `VITE_TILES`           | `openfreemap` — векторная подложка OSM без ключа; `none` — бумажный фон и метки | `openfreemap` |
| `VITE_MOCK_LATENCY_MS` | задержка mock-ответов                                                           | `300`         |

Все `VITE_*` попадают в бандл — секретов в них нет. Пример — `.env.example`.

## Документация

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — слои, папки, публичный API модулей, как добавить модуль, live-бэкенд, Android, другой регион.
- [docs/adr/](docs/adr/) — решения: стек, хостинг, карта, API, платформа, тесты, состояние.
- [docs/HANDOFF.md](docs/HANDOFF.md) — бриф для продолжения работы.
- [../docs/API_CONTRACT.md](../docs/API_CONTRACT.md) и [../docs/openapi.json](../docs/openapi.json) — контракт с бэкендом; [../docs/BACKEND_REQUESTS.md](../docs/BACKEND_REQUESTS.md) — что нужно от бэкенда.
- [CLAUDE.md](CLAUDE.md) — команды, правила и грабли для работы с Claude Code.

## Данные

Данные демонстрационные и помечены в интерфейсе. Исключение — 84 памятника войны из OpenStreetMap (`npm run memorials`, `src/api/fixtures/memorials.osm.json`): настоящие, со ссылкой на объект OSM. Файлы в формате жюри (`fixtures/jury/`) сгенерированы по схеме кейса и вымышлены. Источники, на которые ссылается интерфейс: «Книга Памяти» Орловской области, ОБД «Мемориал» Минобороны России, «Память народа», OpenStreetMap.
