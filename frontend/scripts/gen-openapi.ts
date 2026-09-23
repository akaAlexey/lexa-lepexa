/** Пишет ../docs/openapi.json из контракта фронтенда. Запуск: npm run contract */
import { writeFileSync } from 'node:fs'
import { buildOpenApi } from '../src/contract/openapi.ts'

const out = new URL('../../docs/openapi.json', import.meta.url)
writeFileSync(out, JSON.stringify(buildOpenApi(), null, 2) + '\n')
console.log(`OK: ${out.pathname}`)
