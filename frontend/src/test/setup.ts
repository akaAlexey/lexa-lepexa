import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => cleanup())

// В jsdom нет WebGL: карту подменяем лёгкой заглушкой со списком меток-кнопок.
vi.mock('../map/MapView.tsx', async () => await import('./MapViewStub.tsx'))
