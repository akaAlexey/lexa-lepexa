import type { z } from 'zod'
import type { Endpoint, EndpointName, Endpoints } from '../contract/endpoints.ts'
import type { AppNotification } from '../contract/schemas.ts'

/** '/routes/{id}/join' → { id: string } */
type PathParams<P extends string> = P extends `${string}{${infer K}}${infer Rest}`
  ? { [key in K]: string } & PathParams<Rest>
  : unknown

type BodyArg<E extends Endpoint> = E['body'] extends z.ZodType
  ? { body: z.input<E['body']> }
  : unknown

export type EndpointArgs<E extends Endpoint> = PathParams<E['path']> & BodyArg<E>

type Method<E extends Endpoint> = keyof EndpointArgs<E> extends never
  ? () => Promise<z.output<E['response']>>
  : (args: EndpointArgs<E>) => Promise<z.output<E['response']>>

export type EndpointMethods = { [K in EndpointName]: Method<Endpoints[K]> }

export interface AuthAccount {
  id: string
  login: string
  name?: string
  since: string
}

export interface AuthApi {
  login(input: { login: string; password: string }): Promise<AuthAccount>
  register(input: {
    login: string
    password: string
    name: string
    terms: boolean
    privacy: boolean
  }): Promise<AuthAccount>
  me(): Promise<AuthAccount | null>
  logout(): Promise<void>
}

/** Единый интерфейс API. Его реализуют mock- и live-адаптеры. */
export interface ApiClient extends EndpointMethods {
  /** Реальная серверная авторизация есть у live-адаптера; mock использует локальную витрину. */
  auth?: AuthApi
  /** Подписка на поток уведомлений. Возвращает функцию отписки. */
  onNotification(listener: (n: AppNotification) => void): () => void
  /** Только mock: вернуть данные к исходным фикстурам (сброс демо). */
  reset?(): void
}

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Ответ сервера не совпал с контрактом. В dev-режиме это громкая ошибка. */
export class ContractError extends Error {
  constructor(endpoint: string, issues: string) {
    super(`Ответ ${endpoint} не соответствует контракту: ${issues}`)
    this.name = 'ContractError'
  }
}
