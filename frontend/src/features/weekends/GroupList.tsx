import { useRole } from '../../app/RoleContext.tsx'
import type { GroupApplication, Trip } from '../../contract/schemas.ts'
import { peopleText } from '../../domain/groupApplications.ts'
import { can } from '../../functions/core/permissions.ts'
import {
  groupState,
  useGroupApplications,
  useGroupDecision,
  useMyGroups,
  visibleApplications,
} from '../../functions/groupApplications/index.ts'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { StatePill } from '../../ui/StatePill.tsx'
import s from './weekends.module.css'

function Decision({ application }: { application: GroupApplication }) {
  const { decide, busy, failed } = useGroupDecision(application.id)
  return (
    <>
      <div className={s.actions}>
        <Button
          onClick={() => decide('confirmed')}
          disabled={busy}
          icon="check"
          testID={`group-confirm-${application.id}`}
        >
          Принять
        </Button>
        <Button
          onClick={() => decide('clarify')}
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
 * Заявки групп на этот выезд (в карточке выезда): командир видит все и решает,
 * руководитель группы — свои и их статус. Других заявок и контактов не видно.
 */
export function GroupList({ trip }: { trip: Trip }) {
  const { role } = useRole()
  const isCommander = can(role?.id, 'group.decide')
  const applications = useGroupApplications()
  const mine = useMyGroups()
  const shown = visibleApplications(applications.data ?? [], role?.id, mine).filter(
    (a) => a.tripId === trip.id,
  )
  if (shown.length === 0) return null
  return (
    <section aria-labelledby="groups-title">
      <h2 id="groups-title">{isCommander ? 'Заявки групп' : 'Мои заявки групп'}</h2>
      <ul aria-label={isCommander ? 'Заявки групп' : 'Мои заявки групп'} className="stack-list">
        {shown.map((a) => {
          const state = groupState(a)
          return (
            <Card as="li" key={a.id} testID={`group-${a.id}`}>
              <h3>{a.organization}</h3>
              <p className={s.groupMeta}>{peopleText(a.peopleCount)}</p>
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
