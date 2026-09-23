import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import s from './ui.module.css'

interface FieldShellProps {
  label: string
  hint?: string
  error?: string
  children: (ids: {
    inputId: string
    describedBy: string | undefined
    invalid: boolean
  }) => ReactNode
}

/** Подпись, подсказка и ошибка, связанные с полем для скринридера (aria-describedby, aria-invalid). */
function FieldShell({ label, hint, error, children }: FieldShellProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      {hint && (
        <span id={hintId} className={s.hint}>
          {hint}
        </span>
      )}
      {children({ inputId: id, describedBy, invalid: Boolean(error) })}
      {error && (
        <span id={errorId} className={s.error}>
          <Icon name="question" size={1.1} />
          {error}
        </span>
      )}
    </div>
  )
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'> & {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  error?: string
  testID: string
}

/** Текстовое или числовое поле с подписью и ошибкой. Значение — строка, разбор — в экране. */
export function TextField({ label, value, onChange, hint, error, testID, ...rest }: InputProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ inputId, describedBy, invalid }) => (
        <input
          {...rest}
          id={inputId}
          className={s.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          data-testid={testID}
        />
      )}
    </FieldShell>
  )
}

interface SelectProps<V extends string> {
  label: string
  value: V
  options: readonly { value: V; label: string }[]
  onChange: (value: V) => void
  hint?: string
  testID: string
}

export function SelectField<V extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  testID,
}: SelectProps<V>) {
  return (
    <FieldShell label={label} hint={hint}>
      {({ inputId, describedBy }) => (
        <select
          id={inputId}
          className={s.input}
          value={value}
          onChange={(e) => onChange(e.target.value as V)}
          aria-describedby={describedBy}
          data-testid={testID}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  )
}
