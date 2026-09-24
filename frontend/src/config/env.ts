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
    VITE_MOCK_LATENCY_MS: z.coerce.number().int().nonnegative().default(300),
  })
  .refine((env) => env.VITE_API_MODE === 'mock' || env.VITE_API_URL, {
    message: 'VITE_API_URL обязателен при VITE_API_MODE=live',
  })

export type Env = z.infer<typeof EnvSchema>

export const env: Env = EnvSchema.parse(import.meta.env)
