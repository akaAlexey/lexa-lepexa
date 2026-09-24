// Метки MindAR (.mind) из снимков с QR: компилятор MindAR в безголовом Chromium (процессор, без видеокарты).
// Запуск из frontend/: node scripts/live-photo/compile_targets.mjs public/live soldier reichstag
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'

const [dir, ...names] = process.argv.slice(2)
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage()
await page.setContent('<html><body></body></html>')
for (const name of names) {
  const src = 'data:image/jpeg;base64,' + readFileSync(`${dir}/${name}.jpg`).toString('base64')
  const b64 = await page.evaluate(async (dataUrl) => {
    const { Compiler } =
      await import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js')
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const compiler = new Compiler()
    await compiler.compileImageTargets([img], () => {})
    const bytes = new Uint8Array(await compiler.exportData())
    let s = ''
    for (const b of bytes) s += String.fromCharCode(b)
    return btoa(s)
  }, src)
  writeFileSync(`${dir}/${name}.mind`, Buffer.from(b64, 'base64'))
  console.log(`${dir}/${name}.mind`)
}
await browser.close()
