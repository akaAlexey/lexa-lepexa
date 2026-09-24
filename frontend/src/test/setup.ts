import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Экран рендерится с приложением целиком; под нагрузкой первый рендер дольше секунды по умолчанию.
configure({ asyncUtilTimeout: 3000 })

afterEach(() => cleanup())

// В jsdom нет WebGL: карту подменяем лёгкой заглушкой со списком меток-кнопок.
vi.mock('../map/MapView.tsx', async () => await import('./MapViewStub.tsx'))
