/**
 * Платформенные интерфейсы. Экраны зависят только от них.
 * Реализации: web/ — сейчас, capacitor/ — в фазе Android, demo/ — подмена для показа жюри.
 */
import type { LatLon } from '../contract/schemas.ts'

export interface GeoService {
  /** Текущая позиция. В демо-режиме — подставленная с пульта. */
  getPosition(): Promise<LatLon>
  /** Источник позиции: реальное устройство или демо-подстановка. */
  readonly source: 'device' | 'demo'
  /** Только у демо-геопозиции: подставить точку с пульта. */
  setPosition?(p: LatLon): void
}

export type NotifyPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export interface NotifyService {
  permission(): NotifyPermission
  requestPermission(): Promise<NotifyPermission>
  /** Системное уведомление, если разрешено. Внутри приложения тост показывается всегда. */
  show(n: { title: string; body: string; url?: string }): void
}

/** shared — открылось системное «Поделиться», copied — ссылка в буфере, unsupported — ни то ни другое. */
export type ShareResult = 'shared' | 'copied' | 'unsupported'

export interface ShareService {
  /** Поделиться ссылкой на экран: системное меню на телефоне, копирование ссылки на ноутбуке. */
  share(item: { title: string; text?: string; url: string }): Promise<ShareResult>
}

export interface StorageService {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  remove(key: string): void
  /** Удалить все данные приложения на устройстве (сброс демо). */
  clear(): void
}

export interface Platform {
  geo: GeoService
  notify: NotifyService
  storage: StorageService
  share: ShareService
}
