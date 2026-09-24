# ADR 0001. Стек: React + TypeScript + Vite (PWA), Android — через Capacitor

- Статус: принято (арбитр утвердил 2026-09-23)
- Контекст: главная платформа этой фазы — веб (телефон от 360 px и ноутбук), следующая — Android из той же кодовой базы, iOS не делаем. По умолчанию бриф предлагал Expo + Expo Router.

## Решение

React 19 + TypeScript (strict, `noUncheckedIndexedAccess`) + Vite 8, маршрутизация React Router. Android в следующей фазе — Capacitor: то же веб-приложение в WebView плюс нативные плагины за платформенными интерфейсами (ADR 0005).

## Почему не Expo

| Критерий           | Vite + Capacitor                               | Expo                                                                                |
| ------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| Карта              | один код MapLibre GL JS и в вебе, и в WebView  | два компонента: maplibre-gl в вебе и maplibre-react-native, общий только JSON-стиль |
| PWA и офлайн       | зрелые инструменты (vite-plugin-pwa / Workbox) | service worker вручную                                                              |
| Доступность в вебе | родной HTML: ARIA, фокус, масштаб 200 %        | react-native-web переводит props в ARIA, с особенностями                            |
| Тесты              | Vitest + Testing Library в jsdom — быстро      | Jest + RNTL                                                                         |
| Бандл и Lighthouse | нет рантайма react-native-web                  | больше                                                                              |
| Минус              | на Android — WebView, а не нативный UI         | —                                                                                   |

## Когда пересмотреть

Если на среднем Android-устройстве WebView не держит карту с 500+ метками (FPS < 30 при панорамировании) — переносим экран карты на MapLibre Native. Чтобы переезд был дешёвым, `src/domain`, `src/contract` и `src/api` не зависят от DOM и React.

## Цена

Каркас — около 5 ч. Переход на Expo по оценке добавил бы 20–30 % к фундаменту.
