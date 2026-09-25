import { ApiError } from '../../api/index.ts'

/** Сервер ответил «не найдено»: экран показывает «нет такой карточки», а не «ошибка связи». */
export const isNotFound = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 404
