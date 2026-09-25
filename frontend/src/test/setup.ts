import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Экран рендерится с приложением целиком; под нагрузкой первый рендер дольше секунды по умолчанию.
configure({ asyncUtilTimeout: 3000 })

afterEach(() => {
  cleanup()
  // renderApp пишет в localStorage jsdom (createWebStorage берёт его по умолчанию): без очистки
  // записи, отметки чек-листа и выбор «свернуть» одного теста попадали в следующий
  if (typeof window !== 'undefined') window.localStorage.clear()
})

// В jsdom нет WebGL: карту подменяем лёгкой заглушкой со списком меток-кнопок.
vi.mock('../map/MapView.tsx', async () => await import('./MapViewStub.tsx'))
