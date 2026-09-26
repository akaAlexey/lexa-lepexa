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

export interface CameraSession {
  stop(): void
}

export interface ImageTrackingSession extends CameraSession {}

export interface ImageTrackingOptions {
  /** Куда вывести изображение с камеры. */
  container: HTMLElement
  /** Скомпилированная метка снимка (.mind). */
  targetUrl: string
  /** Ролик, который ложится поверх снимка. */
  video: HTMLVideoElement
  /** Высота снимка к ширине — чтобы ролик совпал с рамкой снимка. */
  aspect: number
  onFound(): void
  onLost(): void
  /** Отмена запуска (закрыли экран, истёк таймаут): камера гаснет, промис отклоняется с AbortError. */
  signal?: AbortSignal
}

export interface ArService {
  /** Запросить доступ к камере и показать обычное превью в video. */
  openCamera(video: HTMLVideoElement): Promise<CameraSession>
  /**
   * Узнать снимок в камере и положить поверх него ролик. Ошибка — если нет защищённого адреса (https),
   * камеры или доступа к ней. При любой ошибке и отмене камера уже выключена.
   */
  trackImage(options: ImageTrackingOptions): Promise<ImageTrackingSession>
}

export interface StorageService {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  remove(key: string): void
  /** Удалить все данные приложения на устройстве (сброс демо). */
  clear(): void
  /** Ключи данных приложения на устройстве (синхронизация личного состояния с аккаунтом). */
  keys?(): string[]
}

export interface ImageService {
  /** Уменьшить фото до `maxSide` px по большей стороне и вернуть data: URL (JPEG). */
  prepare(file: Blob, maxSide?: number): Promise<string>
}

export interface Platform {
  geo: GeoService
  notify: NotifyService
  storage: StorageService
  share: ShareService
  ar: ArService
  /** Фото к историям. Нет в тестовых подменах — тогда фото читается без уменьшения. */
  images?: ImageService
}
