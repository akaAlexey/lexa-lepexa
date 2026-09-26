import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { chooseApi } from './api/index.ts'
import { App } from './app/App.tsx'
import { appRoutes } from './app/routes.tsx'
import { createServices } from './app/services.tsx'
import { env } from './config/env.ts'
import { createWebPlatform, registerOffline } from './platform/index.ts'
import './theme/global.css'
import { applyTheme } from './theme/tokens.ts'

applyTheme()

// Сайт переехал с team-shpilit.github.io/lexa-lepexa/ на свой домен: старые ссылки и QR вида
// …/lexa-lepexa/live/soldier открывают тот же экран в корне (история браузера не засоряется).
const LEGACY_BASE = '/lexa-lepexa'
if (import.meta.env.BASE_URL === '/' && window.location.pathname.startsWith(`${LEGACY_BASE}/`)) {
  const { pathname, search, hash } = window.location
  window.history.replaceState(null, '', pathname.slice(LEGACY_BASE.length) + search + hash)
}

registerOffline()

// Приложение (APK) сначала проверяет сервер; сайт выбирает API сразу (chooseApi не ждёт)
const root = createRoot(document.getElementById('root')!)
void chooseApi(env).then((api) =>
  root.render(
    <StrictMode>
      <App
        services={createServices(api, createWebPlatform())}
        // На GitHub Pages приложение живёт в /lexa-lepexa/ — базовый путь берём из сборки (--base)
        router={createBrowserRouter(appRoutes, { basename: import.meta.env.BASE_URL })}
      />
    </StrictMode>,
  ),
)
