import { useState } from 'react'
import type { LastBattleSite, SiteStatus } from '../../contract/schemas.ts'
import {
  ARCHIVE_KINDS,
  useChangeStatus,
  type ArchiveKind,
  type StatusAction,
} from '../../functions/places/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { SelectField, TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { SITE_STATUS_META } from '../../ui/siteStatus.ts'

/** Сообщение после смены статуса. Живёт в карточке: после смены блок действия исчезает. */
export function StatusChanged({ status }: { status: SiteStatus }) {
  return (
    <Notice tone="success" testID="site-status-done">
      Статус изменён: «{SITE_STATUS_META[status].label}». Источник добавлен в карточку.
    </Notice>
  )
}

const TEXT: Record<StatusAction, { heading: string; field: string; hint: string; button: string }> =
  {
    confirm: {
      heading: 'Проверка по архиву',
      field: 'Том, страница или номер документа',
      hint: 'Например: т. 5, с. 112. Ссылка появится в источниках места',
      button: 'Подтвердить по архиву',
    },
    raise: {
      heading: 'Подъём останков',
      field: 'Акт подъёма или место перезахоронения',
      hint: 'Например: акт № 14 от 12.10.2026, перезахоронены в братской могиле д. Кромы',
      button: 'Отметить: останки подняты',
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
  const [kind, setKind] = useState<ArchiveKind>('book_of_memory')
  const [detail, setDetail] = useState('')
  const { problem, busy, failed, submit } = useChangeStatus(site.id, onDone)
  const t = TEXT[action]

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
        error={problem}
        testID={`site-${action}-detail`}
      />
      <Submit
        onClick={() => void submit({ action, kind, detail })}
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
