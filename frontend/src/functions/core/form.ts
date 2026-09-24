/**
 * Модель формы: одна механика для всех форм (заявка, место, группа, история).
 * Значения → запрос → правила из domain/ → ошибки по полям и первое поле с ошибкой.
 * Без React: те же правила проверяет тест и будущая Android-оболочка.
 */

/** Ошибки по полям: поле → текст для человека. */
export type FieldErrors = Readonly<Partial<Record<string, string>>>

export interface FormSpec<V, Req, Ctx> {
  /** Поля в порядке на экране — чтобы найти первое поле с ошибкой. */
  readonly order: readonly string[]
  /** Начальные значения: шаблон, прошлая заявка, координаты устройства. */
  initial(ctx: Ctx): V
  /** Значения формы → запрос к API: обрезка пробелов, числа из строк. */
  toRequest(values: V, ctx: Ctx): Req
  /** Правила из domain/ — ошибки по полям; пустой объект — всё верно. */
  validate(request: Req, values: V, ctx: Ctx): FieldErrors
}

export type FormCheck<Req> =
  { ok: true; request: Req } | { ok: false; errors: FieldErrors; firstInvalid: string }

export function checkForm<V, Req, Ctx>(
  spec: FormSpec<V, Req, Ctx>,
  values: V,
  ctx: Ctx,
): FormCheck<Req> {
  const request = spec.toRequest(values, ctx)
  const errors = spec.validate(request, values, ctx)
  const invalid = Object.keys(errors).filter((field) => errors[field] !== undefined)
  if (invalid.length === 0) return { ok: true, request }
  const firstInvalid = spec.order.find((field) => invalid.includes(field)) ?? invalid[0] ?? ''
  return { ok: false, errors, firstInvalid }
}
