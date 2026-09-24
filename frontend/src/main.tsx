import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { createApi } from './api/index.ts'
import { App } from './app/App.tsx'
import { appRoutes } from './app/routes.tsx'
import { createServices } from './app/services.tsx'
import { env } from './config/env.ts'
import { createWebPlatform } from './platform/index.ts'
import './theme/global.css'
import { applyTheme } from './theme/tokens.ts'

applyTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      services={createServices(createApi(env), createWebPlatform())}
      // На GitHub Pages приложение живёт в /lexa-lepexa/ — базовый путь берём из сборки (--base)
      router={createBrowserRouter(appRoutes, { basename: import.meta.env.BASE_URL })}
    />
  </StrictMode>,
)
