import { Button } from './Button.tsx'
import s from './ui.module.css'

interface Props<V extends string | number> {
  legend: string
  options: readonly { value: V; label: string; testID: string }[]
  value: V | undefined
  onChange: (value: V) => void
}

/** Выбор одного варианта крупными кнопками (aria-pressed) — быстрее списка на телефоне. */
export function ChoiceChips<V extends string | number>({
  legend,
  options,
  value,
  onChange,
}: Props<V>) {
  return (
    <fieldset className={s.chips}>
      <legend>{legend}</legend>
      {options.map((o) => (
        <Button
          key={String(o.value)}
          testID={o.testID}
          pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </fieldset>
  )
}

interface ToggleProps<V extends string> {
  legend: string
  options: readonly { value: V; label: string; testID: string }[]
  value: readonly V[]
  onChange: (value: V[]) => void
}

/** Несколько вариантов сразу (слои карты): каждый чип включается и выключается сам. */
export function ToggleChips<V extends string>({
  legend,
  options,
  value,
  onChange,
}: ToggleProps<V>) {
  return (
    <fieldset className={s.chips}>
      <legend>{legend}</legend>
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <Button
            key={o.value}
            testID={o.testID}
            pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
          >
            {o.label}
          </Button>
        )
      })}
    </fieldset>
  )
}
