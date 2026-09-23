import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { createApi } from './api/index.ts'
import { App } from './app/App.tsx'
import { appRoutes } from './app/routes.tsx'
import { env } from './config/env.ts'
import { createWebPlatform } from './platform/index.ts'
import './theme/global.css'
import { applyTheme } from './theme/tokens.ts'

applyTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      services={{ api: createApi(env), platform: createWebPlatform() }}
      router={createBrowserRouter(appRoutes)}
    />
  </StrictMode>,
)
