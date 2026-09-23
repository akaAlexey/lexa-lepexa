import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useRole } from '../../app/RoleContext.tsx'
import { useServices } from '../../app/services.tsx'
import type { GroupApplication, Trip } from '../../contract/schemas.ts'
import { formatDayRu } from '../../domain/format.ts'
import { peopleText } from '../../domain/groupApplications.ts'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { StatePill } from '../../ui/StatePill.tsx'
import { groupState, groupsKey, useGroupApplications, useMyGroups } from './groups.ts'
import s from './weekends.module.css'

function Decision({ application }: { application: GroupApplication }) {
  const { api } = useServices()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const decide = async (status: 'confirmed' | 'clarify') => {
    setBusy(true)
    setFailed(false)
    try {
      const updated = await api.decideGroupApplication({ id: application.id, body: { status } })
      queryClient.setQueryData<GroupApplication[]>(groupsKey, (old) =>
        old?.map((a) => (a.id === updated.id ? updated : a)),
      )
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className={s.actions}>
        <Button
          onClick={() => void decide('confirmed')}
          disabled={busy}
          icon="check"
          testID={`group-confirm-${application.id}`}
        >
          Принять
        </Button>
        <Button
          onClick={() => void decide('clarify')}
          disabled={busy}
          testID={`group-clarify-${application.id}`}
        >
          Уточнить
        </Button>
      </div>
      {failed && <Notice tone="error">Не удалось сохранить решение. Попробуйте ещё раз.</Notice>}
    </>
  )
}

/**
 * Коллективные заявки из макета: командир видит все и решает, руководитель группы — свои и их статус.
 */
export function GroupList({ trips }: { trips: readonly Trip[] }) {
  const { role } = useRole()
  const isCommander = role?.id === 'commander'
  const applications = useGroupApplications()
  const mine = useMyGroups()
  const tripById = new Map(trips.map((t) => [t.id, t]))
  const shown = (applications.data ?? []).filter((a) => isCommander || mine.ids.includes(a.id))
  if (shown.length === 0) return null
  return (
    <section aria-labelledby="groups-title">
      <h2 id="groups-title">{isCommander ? 'Заявки групп' : 'Мои заявки групп'}</h2>
      <ul aria-label={isCommander ? 'Заявки групп' : 'Мои заявки групп'} className="stack-list">
        {shown.map((a) => {
          const trip = tripById.get(a.tripId)
          const state = groupState(a)
          return (
            <Card as="li" key={a.id} testID={`group-${a.id}`}>
              <h3>{a.organization}</h3>
              <p className={s.groupMeta}>
                {trip ? `${formatDayRu(trip.date)}. ${trip.title}` : 'Выезд'} ·{' '}
                {peopleText(a.peopleCount)}
              </p>
              {isCommander && (
                <p className={s.groupMeta}>
                  {a.contactName}, {a.contact}
                  {a.comment && ` · ${a.comment}`}
                </p>
              )}
              <p className={s.badges}>
                <StatePill label={state.label} tone={state.tone} testID={`group-status-${a.id}`} />{' '}
                {a.demo && <DemoBadge />}
              </p>
              {isCommander && a.status === 'pending' && <Decision application={a} />}
            </Card>
          )
        })}
      </ul>
    </section>
  )
}
