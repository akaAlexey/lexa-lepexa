import { z } from 'zod'

/**
 * Публичные переменные окружения. Попадают в клиентский бандл — секретов здесь нет.
 * Неверная конфигурация падает при старте, а не на демо.
 */
const EnvSchema = z
  .object({
    VITE_API_MODE: z.enum(['mock', 'live']).default('mock'),
    // Абсолютный адрес (https://…/api/v1) или путь на том же домене (/api/v1 — за общим прокси).
    // Пустая строка = не задан (так приходит пустая переменная из CI).
    VITE_API_URL: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.union([z.url(), z.string().regex(/^\/[^/]/)]).optional(),
    ),
    VITE_TILES: z.enum(['openfreemap', 'none']).default('openfreemap'),
    // Приложение (APK): сервер не ответил при запуске — работать на встроенных данных (device),
    // а не показывать ошибки загрузки. Сайт — только сервер (none).
    VITE_API_FALLBACK: z.enum(['none', 'device']).default('none'),
    VITE_MOCK_LATENCY_MS: z.coerce.number().int().nonnegative().default(300),
    // Геопозиция по умолчанию: device — настоящий GPS, demo — точка из конфига региона (e2e, показ)
    VITE_GEO_DEFAULT: z.enum(['device', 'demo']).default('device'),
  })
  .refine((env) => env.VITE_API_MODE === 'mock' || env.VITE_API_URL, {
    message: 'VITE_API_URL обязателен при VITE_API_MODE=live',
  })

export type Env = z.infer<typeof EnvSchema>

export const env: Env = EnvSchema.parse(import.meta.env)
