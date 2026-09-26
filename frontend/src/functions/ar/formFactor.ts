/**
 * Телефон или компьютер — для AR-режима: камера и 3D-боец — только на телефоне (и в приложении),
 * на компьютере — объяснение и предпросмотр модели.
 */
export type FormFactor = 'phone' | 'desktop'

export interface DeviceHints {
  userAgent: string
  /** navigator.userAgentData.mobile — есть в Chrome на Android. */
  mobile?: boolean
  /** Точное указание устройства ввода: мышь — fine, палец — coarse. */
  coarsePointer: boolean
  maxTouchPoints: number
  /** Внутри мобильного приложения (Capacitor). */
  native: boolean
}

const MOBILE_UA = /Android|iPhone|iPod|Mobile|Windows Phone|Opera Mini/i

export function formFactorOf(d: DeviceHints): FormFactor {
  if (d.native || d.mobile === true || MOBILE_UA.test(d.userAgent)) return 'phone'
  // iPad на iPadOS представляется «Macintosh», но у него палец вместо мыши
  if (/Macintosh/i.test(d.userAgent) && d.maxTouchPoints > 1 && d.coarsePointer) return 'phone'
  return 'desktop'
}

/** Подсказки этого браузера. */
export function deviceHints(): DeviceHints {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return {
    userAgent: nav.userAgent ?? '',
    mobile: nav.userAgentData?.mobile,
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    native: cap?.isNativePlatform?.() ?? false,
  }
}
