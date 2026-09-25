import { useEffect, useRef, useState, type FormEvent } from 'react'
import { checkForm, type FieldErrors, type FormSpec } from './form.ts'

export interface FormState<V> {
  values: V
  set<K extends keyof V>(field: K, value: V[K]): void
  errors: FieldErrors
  /** Запрос отправляется. После успеха остаётся true: экран уходит дальше, двойной отправки нет. */
  sending: boolean
  /** Отправка не удалась (сеть, сервер) — показать ошибку и дать повторить. */
  failed: boolean
  /**
   * Обработчик `onSubmit` у `<form>`. После неудачной проверки фокус — на первое поле с ошибкой.
   * `hold` — проверить и показать ошибки полей, но не отправлять (например, нет согласия).
   * Возвращает true, если поля в порядке.
   */
  submit(event: FormEvent<HTMLFormElement>, options?: { hold?: boolean }): boolean
}

/**
 * Состояние формы по модели `FormSpec`. `send` получает уже проверенный запрос.
 * Поля с ошибкой помечаются `aria-invalid` компонентами `ui/Field` — фокус ищется по нему.
 */
export function useForm<V, Req, Ctx>(
  spec: FormSpec<V, Req, Ctx>,
  ctx: Ctx,
  send: (request: Req) => Promise<unknown>,
): FormState<V> {
  const [values, setValues] = useState(() => spec.initial(ctx))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const formRef = useRef<HTMLFormElement | null>(null)

  // После неудачной проверки фокус — на первое поле с ошибкой.
  useEffect(() => {
    if (attempt > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attempt])

  const submit = (event: FormEvent<HTMLFormElement>, options?: { hold?: boolean }) => {
    event.preventDefault()
    formRef.current = event.currentTarget
    const check = checkForm(spec, values, ctx)
    setFailed(false)
    if (!check.ok) {
      setErrors(check.errors)
      setAttempt((a) => a + 1)
      return false
    }
    setErrors({})
    if (options?.hold) return true
    setSending(true)
    send(check.request).catch(() => {
      setFailed(true)
      setSending(false)
    })
    return true
  }

  return {
    values,
    set: (field, value) => setValues((prev) => ({ ...prev, [field]: value })),
    errors,
    sending,
    failed,
    submit,
  }
}
