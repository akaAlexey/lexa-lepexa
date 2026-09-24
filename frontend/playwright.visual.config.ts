import { defineConfig } from '@playwright/test'
import base from './playwright.config.ts'

/** Визуальный контроль рефакторинга (см. e2e-visual/screens.spec.ts). Не входит в verify. */
export default defineConfig({
  ...base,
  testDir: './e2e-visual',
  snapshotPathTemplate: `${process.env.VISUAL_DIR ?? 'e2e-visual/baseline'}/{projectName}/{arg}{ext}`,
  reporter: [['list']],
})
