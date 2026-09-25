import { expect, test } from '@playwright/test'

/**
 * Визуальный контроль рефакторинга (шаг A, ADR 0008): экраны до и после совпадают пиксель в пиксель.
 * Эталон снят до шага A (`npm run visual -- --update-snapshots`) и лежит в e2e-visual/baseline.
 * Экраны без карты снимаются целиком. Экраны с картой — видимая область: полностраничный снимок
 * растягивает окно, карта перестраивается, и метки съезжают.
 */
const SCREENS: [role: string, url: string][] = [
  ['', '/roles'],
  ['family', '/trail'],
  ['family', '/trail/park-3km/point/okop'],
  ['family', '/trail/park-3km/finish'],
  ['commander', '/search/requests/new'],
  ['volunteer', '/weekends/W01'],
  ['commander', '/weekends/W01'],
  ['family', '/weekends/W01/group'],
  ['volunteer', '/last-battle'],
  ['commander', '/last-battle'],
  ['commander', '/last-battle/new'],
  ['volunteer', '/last-battle/S01'],
  ['commander', '/last-battle/S01'],
  ['family', '/archive'],
  ['verifier', '/archive'],
  ['family', '/archive/new'],
  ['verifier', '/archive/ST01'],
  ['family', '/chronicle'],
  ['', '/demo'],
]

for (const [role, url] of SCREENS) {
  test(`${role || 'без роли'} ${url}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-02T09:00:00Z'))
    if (role)
      await page.addInitScript((r) => localStorage.setItem('tropa:role', JSON.stringify(r)), role)
    await page.goto(url)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('[data-ready="false"]')).toHaveCount(0, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    const hasMap = (await page.locator('[data-map-frame]').count()) > 0
    await expect(page).toHaveScreenshot(`${(role || 'none') + url.replaceAll('/', '_')}.png`, {
      fullPage: !hasMap,
      // номер сборки меняется при каждой сборке
      mask: [page.getByTestId('demo-build')],
      // карта на ноутбуке устаивается дольше 5 с под нагрузкой
      timeout: 15_000,
      maxDiffPixels: 0,
      animations: 'disabled',
    })
  })
}
