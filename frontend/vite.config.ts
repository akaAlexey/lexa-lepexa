import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
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
    include: ['src/**/*.test.{ts,tsx}'],
    env: { VITE_MOCK_LATENCY_MS: '0' },
  },
})
