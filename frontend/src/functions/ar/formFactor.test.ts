// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { formFactorOf, type DeviceHints } from './formFactor.ts'

const desktop: DeviceHints = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
  coarsePointer: false,
  maxTouchPoints: 0,
  native: false,
}

describe('AR: телефон или компьютер', () => {
  it('компьютер с мышью — desktop', () => expect(formFactorOf(desktop)).toBe('desktop'))

  it('Android, iPhone, мобильный Chrome — phone', () => {
    expect(
      formFactorOf({ ...desktop, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile' }),
    ).toBe('phone')
    expect(
      formFactorOf({ ...desktop, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' }),
    ).toBe('phone')
    expect(formFactorOf({ ...desktop, mobile: true })).toBe('phone')
  })

  it('iPad (представляется Mac, но с пальцем) — phone; Mac с тачпадом — desktop', () => {
    const mac = { ...desktop, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    expect(formFactorOf({ ...mac, maxTouchPoints: 5, coarsePointer: true })).toBe('phone')
    expect(formFactorOf(mac)).toBe('desktop')
  })

  it('в мобильном приложении — всегда phone', () =>
    expect(formFactorOf({ ...desktop, native: true })).toBe('phone'))
})
