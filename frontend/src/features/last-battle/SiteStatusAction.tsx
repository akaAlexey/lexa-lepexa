import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useApi } from '../../app/services.tsx'
import type { LastBattleSite, SiteStatus, Source } from '../../contract/schemas.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { SelectField, TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { SITE_STATUS_META } from '../../ui/siteStatus.ts'
import type { StatusAction } from './statusAction.ts'

/** Сообщение после смены статуса. Живёт в карточке: после смены блок действия исчезает. */
export function StatusChanged({ status }: { status: SiteStatus }) {
  return (
    <Notice tone="success" testID="site-status-done">
      Статус изменён: «{SITE_STATUS_META[status].label}». Источник добавлен в карточку.
    </Notice>
  )
}

type ArchiveKind = Extract<
  Source['kind'],
  'book_of_memory' | 'obd_memorial' | 'pamyat_naroda' | 'archive'
>

/** Базы верификации из кейса: Книга Памяти Орловской обл., ОБД «Мемориал», «Память народа». */
const ARCHIVE_KINDS: readonly { value: ArchiveKind; label: string }[] = [
  { value: 'book_of_memory', label: 'Книга Памяти. Орловская область' },
  { value: 'obd_memorial', label: 'ОБД «Мемориал» Минобороны' },
  { value: 'pamyat_naroda', label: '«Память народа»' },
  { value: 'archive', label: 'Архивный документ (ЦАМО, ГАОО)' },
]

const TEXT: Record<
  StatusAction,
  { heading: string; field: string; hint: string; button: string; next: SiteStatus }
> = {
  confirm: {
    heading: 'Проверка по архиву',
    field: 'Том, страница или номер документа',
    hint: 'Например: т. 5, с. 112. Ссылка появится в источниках места',
    button: 'Подтвердить по архиву',
    next: 'archive_confirmed',
  },
  raise: {
    heading: 'Подъём останков',
    field: 'Акт подъёма или место перезахоронения',
    hint: 'Например: акт № 14 от 12.10.2026, перезахоронены в братской могиле д. Кромы',
    button: 'Отметить: останки подняты',
    next: 'remains_raised',
  },
}

interface Props {
  site: LastBattleSite
  action: StatusAction
  /** Главное действие экрана — большая кнопка; иначе вторичная (правило одной большой кнопки). */
  main: boolean
  onDone: (status: SiteStatus) => void
}

export function SiteStatusAction({ site, action, main, onDone }: Props) {
  const api = useApi()
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<ArchiveKind>('book_of_memory')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const t = TEXT[action]

  const submit = async () => {
    if (detail.trim() === '') {
      setError(
        action === 'confirm'
          ? 'Укажите, где в источнике это записано'
          : 'Укажите акт или место перезахоронения',
      )
      return
    }
    setError(undefined)
    setBusy(true)
    setFailed(false)
    const title =
      action === 'confirm'
        ? `${ARCHIVE_KINDS.find((k) => k.value === kind)?.label ?? ''}, ${detail.trim()}`
        : `Акт подъёма: ${detail.trim()}`
    try {
      const updated = await api.changeSiteStatus({
        id: site.id,
        body: {
          status: t.next,
          source: { kind: action === 'confirm' ? kind : 'archive', title },
        },
      })
      queryClient.setQueryData(['sites', site.id], updated)
      void queryClient.invalidateQueries({ queryKey: ['sites'], exact: true })
      onDone(updated.status)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const Submit = main ? BigButton : Button
  return (
    <Card as="section" aria-labelledby="site-status-heading" testID={`site-${action}`}>
      <h2 id="site-status-heading">{t.heading}</h2>
      {action === 'confirm' && (
        <SelectField
          label="Источник"
          value={kind}
          options={ARCHIVE_KINDS}
          onChange={setKind}
          testID="site-confirm-kind"
        />
      )}
      <TextField
        label={t.field}
        hint={t.hint}
        value={detail}
        onChange={setDetail}
        error={error}
        testID={`site-${action}-detail`}
      />
      <Submit
        onClick={() => void submit()}
        disabled={busy}
        icon={action === 'confirm' ? 'archive' : 'check'}
        testID={`site-${action}-submit`}
      >
        {t.button}
      </Submit>
      {failed && (
        <Notice tone="error" testID="site-status-error">
          Статус не изменён: сервер не ответил. Попробуйте ещё раз.
        </Notice>
      )}
    </Card>
  )
}
