# Архитектура фронтенда «Тропа памяти»

Короткая карта кода и правил. Решения с обоснованием — в [adr/](adr/).

## Слои и направление зависимостей

```
features/*  ──►  app/ (сервисы, роли, раскладка)  ──►  ui/, map/, theme/
    │                                                    │
    └──────────►  api/ (ApiClient)  ──►  contract/  ◄────┘
                  platform/ (Geo, Notify, Storage, Share, Ar)
                  domain/ (чистая логика)  ──►  contract/ (только типы)
```

- `domain/`, `contract/`, `api/` не импортируют React и DOM — переносятся в любой стек (ADR 0001).
- Экраны берут API и платформу только через `useServices()` / `useApi()` — не импортируют адаптеры напрямую.
- Модули `features/*` не импортируют друг друга. Общее выносится в `ui/`, `map/` или `domain/`.
- Внутри `src/contract` импорты с расширением `.ts`: эти файлы читает и Node-скрипт генерации OpenAPI.

## Папки

```
frontend/
  src/
    contract/   schemas.ts (zod-сущности) · endpoints.ts (REST-таблица) · openapi.ts (генерация)
    api/        client.ts (ApiClient, ошибки) · mock/ · live/ · fixtures/ (jury.generated.json, seed.ts)
    domain/     geo · lastBattle (статусы, радиус 20 км, текст уведомления) · fundraising · format
    platform/   types.ts · web/ · demo/ · index.ts (createWebPlatform)
    map/        MapView.tsx · style.ts (стиль из токенов) · tiles.ts (источник тайлов)
    theme/      tokens.ts (цвета, шрифты, размеры) · global.css
    ui/         BigButton · Card · StatusBadge · StatePill · DemoBadge · Icon · Logo · Screen · Field · siteStatus
    app/        App · routes · Layout (шапка, вкладки/меню) · RoleContext · roles · services · Toaster · QueryState · ShareButton
    features/   roles · trail · search-hq · weekends · last-battle · archive · chronicle · live-photo — у каждого свой routes.tsx
    config/     env.ts (проверка переменных окружения) · region.ts (регион, тексты, источники)
    test/       setup · renderApp · MapViewStub
  fixtures/jury/   данные в формате жюри (сейчас — демо, сгенерированы по схеме)
  scripts/         build-fixtures · gen-openapi · tunnel.sh · deploy.sh
  deploy/          Caddyfile
  e2e/             Playwright: сценарии, helpers (скриншоты, axe, ошибки консоли)
  docs/            ARCHITECTURE · adr/ · HANDOFF
```

## Публичный API общих модулей (зафиксирован до запуска агентов)

Менять сигнатуры можно только через техлида: от них зависят все модули.

| Модуль                          | Экспорт                                                                                                  | Контракт                                                                                                                                                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/BigButton`                  | `BigButton({ children, icon?, testID, to \| onClick, disabled? })`                                       | Главное действие экрана, одно на экран. Ссылка (`to`) или кнопка (`onClick`)                                                                                                                                                                                    |
| `ui/Screen`                     | `Screen({ title, lead?, testID, children })`                                                             | h1, заголовок вкладки, перенос фокуса на h1 при переходе                                                                                                                                                                                                        |
| `ui/Card`                       | `Card({ as?, testID?, children })`                                                                       | Карточка на бумажном фоне                                                                                                                                                                                                                                       |
| `ui/StatusBadge`                | `StatusBadge({ status })`                                                                                | Статус места: иконка + текст + цвет                                                                                                                                                                                                                             |
| `ui/DemoBadge`                  | `DemoBadge({ text? })`                                                                                   | Пометка демо-данных                                                                                                                                                                                                                                             |
| `ui/Icon`                       | `Icon({ name, size?, label? })`, `IconName`                                                              | Свои SVG; без `label` иконка декоративная                                                                                                                                                                                                                       |
| `map/MapView`                   | `MapView({ label, center, zoom, markers?, route?, onMarkerSelect?, fitToContent?, testID })`             | `markers` — стабильный массив (`useMemo`); метка = кнопка с `testID="marker-<id>"`; `data-ready="true"`, когда карта загружена; `fitToContent` — масштаб по всем меткам; у метки `size: 'small'` и `interactive: false` — фоновый слой без фокуса (захоронения) |
| `ui/Button`                     | `Button({ children, onClick, testID, icon?, pressed?, disabled? })`                                      | Вторичное действие или переключатель (`pressed` → `aria-pressed`)                                                                                                                                                                                               |
| `ui/Field`                      | `TextField({ label, value, onChange, hint?, error?, testID, ...input })`, `SelectField(...)`             | Подпись, подсказка и ошибка связаны с полем (`aria-describedby`, `aria-invalid`)                                                                                                                                                                                |
| `ui/ChoiceChips`                | `ChoiceChips({ legend, options: {value,label,testID}[], value, onChange })`                              | Выбор одного варианта крупными кнопками                                                                                                                                                                                                                         |
| `ui/Notice`                     | `Notice({ children, tone?, testID? })`                                                                   | Результат действия, объявляется скринридером                                                                                                                                                                                                                    |
| `ui/Dialog`                     | `Dialog({ title, children, onClose, testID? })`                                                          | Модальное окно: фокус внутрь, Escape, возврат фокуса                                                                                                                                                                                                            |
| `ui/SourceList`                 | `SourceList({ sources, testID })`                                                                        | Источники факта                                                                                                                                                                                                                                                 |
| `app/services`                  | `useApi()`, `useServices()` → `{ api, platform, demo }`, `subscribeNearby(services)`, `SUBSCRIPTION_KEY` | API, платформа, демо-управление (`setPosition`, `reset`, `buildId`); подписка на находки в 20 км                                                                                                                                                                |
| `app/services` (`own`)          | `own.run(action)`, `own.active()`                                                                        | Уведомления, пришедшие во время собственного действия (публикация места), автору не показываются                                                                                                                                                                |
| `app/RoleContext`               | `useRole()` → `{ role, setRole, clearRole }`                                                             | Текущая роль                                                                                                                                                                                                                                                    |
| `app/QueryState`                | `QueryState({ query, what, children })`                                                                  | Единые загрузка/ошибка/повтор                                                                                                                                                                                                                                   |
| `domain/plural`, `domain/dates` | `pluralRu`, `todayIso`, `tomorrowIso`, `addDaysIso`                                                      | Русские формы числа; даты в часовом поясе региона                                                                                                                                                                                                               |
| `config/region`                 | `region.demo.commanderTeamId`                                                                            | Отряд демо-командира («Высота»)                                                                                                                                                                                                                                 |
| `ui/StatePill`                  | `StatePill({ label, tone: 'wait' \| 'action' \| 'done', testID? })`                                      | Состояние заявки или истории: иконка + подпись + цвет                                                                                                                                                                                                           |
| `ui/Field` (`TextAreaField`)    | `TextAreaField({ label, value, onChange, hint?, error?, rows?, testID })`                                | Многострочное поле с подписью и ошибкой                                                                                                                                                                                                                         |
| `app/ShareButton`               | `ShareButton({ title, text?, testID })`                                                                  | «Поделиться» ссылкой на текущий экран через `platform.share`                                                                                                                                                                                                    |
| `map/MapView` (`shape`)         | `MapMarker.shape?: 'pin' \| 'zone'`                                                                      | `zone` — круг-зона «Последнего боя»: нажимается центр, кольцо — декор                                                                                                                                                                                           |

Рассылка находок без бэкенда: mock-API каждой вкладки шлёт по BroadcastChannel событие «создано место», остальные вкладки добавляют место к себе и уведомляют свои подписки. Подписка хранится на устройстве и восстанавливается при старте (`Toaster`).

## Навигация

- Каждый экран и каждая карточка — свой URL (React Router). Прямые ссылки открываются: `vite preview` и Caddy отдают `index.html`.
- Роль (`app/roles.ts`) задаёт порядок вкладок и домашний экран: семья → `/trail`, волонтёр и командир → `/search`, краевед → `/last-battle`.
- Телефон: вкладки снизу. Ноутбук (от 64rem): меню слева. Точки перелома в rem — при масштабе 200 % включается мобильная раскладка.

## Как добавить модуль

1. Создайте `src/features/<модуль>/` с экранами и `routes.tsx` (массив `RouteObject`).
2. Подключите `routes` в `src/app/routes.tsx`, при необходимости — вкладку в `app/roles.ts`.
3. Новые данные — сначала сущность в `contract/schemas.ts` и эндпоинт в `contract/endpoints.ts`, затем реализация в `api/mock/mockApi.ts` (TypeScript не даст забыть), затем `npm run contract`.
4. Тесты модуля — рядом (`*.test.tsx`) и сценарий в `e2e/`.

## Переключение на живой бэкенд

```
VITE_API_MODE=live VITE_API_URL=https://<домен>/api/v1 npm run build
```

Каждый ответ проверяется схемой. Расхождение с контрактом видно сразу как `ContractError` в консоли.

## Перенос на Android (следующая фаза)

1. `npm i @capacitor/core @capacitor/android` и `npx cap add android` — веб-сборка из `dist/` едет в WebView без изменений (карта та же, MapLibre GL JS).
2. Реализовать `platform/capacitor/` (geolocation, local-notifications / push, preferences) и выбирать её в `src/platform/index.ts` по `Capacitor.isNativePlatform()`.
3. Критерий перехода на нативную карту — в ADR 0001.

## Аналог для другого региона или темы

Замените `src/config/region.ts` (название, центр карты, источники), данные в `fixtures/` и при желании токены в `src/theme/tokens.ts`. Код экранов не меняется.

## Цифры (2026-09-23, конец этапа 4)

| Метрика                            | Значение                                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Строк кода в `src` без тестов      | ≈ 5 400                                                                                                                                                         |
| Сущностей в контракте / эндпоинтов | 30 / 20 + SSE                                                                                                                                                   |
| Начальный JS (gzip)                | 160 КБ; MapLibre (274 КБ) и его воркер (140 КБ) грузятся только на экранах с картой                                                                             |
| Тесты                              | 77 unit и компонентных (18 файлов), 46 e2e в двух вьюпортах + 2 намеренно пропущены; axe на каждом экране P0                                                    |
| Прочее                             | прокрутка сбрасывается при переходе (`ScrollRestoration`), тост резервирует место внизу страницы (`--toast-space`), рамки полей — токен `controlBorder` (5,4:1) |
