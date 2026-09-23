import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

function buildId(): string {
  let commit = 'local'
  try {
    commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    /* сборка вне git */
  }
  return `${commit}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`
}

export default defineConfig({
  plugins: [react()],
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  // MapLibre 6 грузит свой воркер по относительному URL — предсборка Vite его ломает.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  worker: { format: 'es' },
  preview: {
    // Временный HTTPS-туннель localhost.run (см. docs/adr/0002-hosting.md)
    allowedHosts: ['.lhr.life'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Компонентные тесты рендерят приложение целиком; под нагрузкой (параллельные агенты) 5 с мало.
    testTimeout: 15_000,
    include: ['src/**/*.test.{ts,tsx}'],
    env: { VITE_MOCK_LATENCY_MS: '0' },
  },
})
