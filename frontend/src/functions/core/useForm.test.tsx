import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TextField } from '../../ui/Field.tsx'
import type { FormSpec } from './form.ts'
import { useForm } from './useForm.ts'

interface Values {
  title: string
  place: string
}

const spec: FormSpec<Values, Values, void> = {
  order: ['title', 'place'],
  initial: () => ({ title: '', place: '' }),
  toRequest: (v) => ({ title: v.title.trim(), place: v.place.trim() }),
  validate: (r) => ({
    ...(r.title ? {} : { title: 'Укажите название' }),
    ...(r.place ? {} : { place: 'Укажите место' }),
  }),
}

function Form({ send }: { send: (r: Values) => Promise<unknown> }) {
  const form = useForm(spec, undefined, send)
  return (
    <form onSubmit={form.submit} noValidate>
      <TextField
        label="Название"
        value={form.values.title}
        onChange={(v) => form.set('title', v)}
        error={form.errors.title}
        testID="title"
      />
      <TextField
        label="Место"
        value={form.values.place}
        onChange={(v) => form.set('place', v)}
        error={form.errors.place}
        testID="place"
      />
      {form.failed && <p role="alert">Не удалось отправить</p>}
      <button type="submit" disabled={form.sending}>
        Отправить
      </button>
    </form>
  )
}

describe('useForm', () => {
  it('ошибка проверки: запрос не уходит, фокус на первом поле с ошибкой', async () => {
    const send = vi.fn<(r: Values) => Promise<unknown>>(async () => undefined)
    render(<Form send={send} />)
    await userEvent.type(screen.getByTestId('place'), 'Орёл')
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }))
    expect(send).not.toHaveBeenCalled()
    expect(screen.getByTestId('title')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByTestId('title')).toHaveFocus()
  })

  it('верная форма уходит проверенным запросом и блокирует повторную отправку', async () => {
    const send = vi.fn<(r: Values) => Promise<unknown>>(async () => undefined)
    render(<Form send={send} />)
    await userEvent.type(screen.getByTestId('title'), ' Набор ')
    await userEvent.type(screen.getByTestId('place'), 'Орёл')
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }))
    expect(send).toHaveBeenCalledWith({ title: 'Набор', place: 'Орёл' })
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled()
  })

  it('сбой сети: сообщение и можно повторить', async () => {
    const send = vi.fn<(r: Values) => Promise<unknown>>(async () => {
      throw new Error('сеть')
    })
    render(<Form send={send} />)
    await userEvent.type(screen.getByTestId('title'), 'Набор')
    await userEvent.type(screen.getByTestId('place'), 'Орёл')
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось отправить')
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeEnabled()
  })
})
