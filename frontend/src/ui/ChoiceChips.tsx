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
