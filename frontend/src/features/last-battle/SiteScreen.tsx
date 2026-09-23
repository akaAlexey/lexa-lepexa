import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../../api/client.ts'
import { QueryState } from '../../app/QueryState.tsx'
import { ShareButton } from '../../app/ShareButton.tsx'
import { useApi } from '../../app/services.tsx'
import type { LastBattleSite, SiteStatus } from '../../contract/schemas.ts'
import { describeFighters, NOTIFY_RADIUS_KM } from '../../domain/lastBattle.ts'
import { useRole } from '../../app/RoleContext.tsx'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { SourceList } from '../../ui/SourceList.tsx'
import { StatusBadge } from '../../ui/StatusBadge.tsx'
import type { SiteCreatedState } from './NewSiteScreen.tsx'
import s from './lastBattle.module.css'

/** Подъём нужен, пока останки не подняты. */
const NEEDS_RAISING: readonly SiteStatus[] = ['found_needs_check', 'archive_confirmed']

const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404

function readNotified(state: unknown): number | undefined {
  const n = (state as Partial<SiteCreatedState> | null)?.notifiedCount
  return typeof n === 'number' ? n : undefined
}

function HelpAction({ site }: { site: LastBattleSite }) {
  const api = useApi()
  const queryClient = useQueryClient()
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const help = async () => {
    setBusy(true)
    setFailed(false)
    try {
      const updated = await api.volunteerForSite({ id: site.id })
      queryClient.setQueryData(['sites', site.id], updated)
      void queryClient.invalidateQueries({ queryKey: ['sites'], exact: true })
      setDone(true)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Notice tone="success" testID="site-help-done">
        <p>Спасибо! Командир отряда свяжется с вами перед выездом.</p>
        <Link to="/weekends">Выходные с поисковиком</Link> — подготовьтесь к первому выезду.
      </Notice>
    )
  }
  return (
    <>
      <BigButton onClick={() => void help()} disabled={busy} icon="shovel" testID="site-help">
        Я готов помочь в подъёме
      </BigButton>
      {failed && (
        <Notice tone="error" testID="site-help-error">
          Не удалось отправить отклик. Проверьте связь и попробуйте ещё раз.
        </Notice>
      )}
    </>
  )
}

function SiteCard({ site, notified }: { site: LastBattleSite; notified: number | undefined }) {
  const needsRaising = NEEDS_RAISING.includes(site.status)
  const roleId = useRole().role?.id
  const isCommander = roleId === 'commander'
  // Защита от «чёрных копателей»: точные координаты — только поисковикам и краеведам.
  // Это витрина; настоящее скрытие должен делать сервер (docs/BACKEND_REQUESTS.md).
  const seesExactCoords = isCommander || roleId === 'verifier'
  return (
    <>
      {notified !== undefined && (
        <Notice tone="success" testID="site-notified">
          Уведомлено подписчиков в радиусе {NOTIFY_RADIUS_KM} км: {notified}
        </Notice>
      )}
      <p>
        <StatusBadge status={site.status} /> {site.demo && <DemoBadge />}
      </p>
      {needsRaising && (
        <p className={s.need} data-testid="site-need">
          <Icon name="shovel" />
          Требуется подъём
        </p>
      )}
      {isCommander ? (
        // Командир место и отметил — его главное действие: отметить следующее
        <BigButton to="/last-battle/new" icon="pin" testID="site-add-next">
          Отметить ещё одно место
        </BigButton>
      ) : (
        needsRaising && <HelpAction site={site} />
      )}
      <Card as="section" aria-labelledby="site-facts">
        <h2 id="site-facts">Что известно</h2>
        <dl className={s.facts}>
          <dt>Бойцы</dt>
          <dd data-testid="site-fighters">{describeFighters(site)}</dd>
          <dt>Когда</dt>
          <dd data-testid="site-date">{site.dateText}</dd>
          <dt>Часть</dt>
          <dd data-testid="site-unit">{site.unit}</dd>
          {site.circumstances && (
            <>
              <dt>Обстоятельства</dt>
              <dd data-testid="site-circumstances">{site.circumstances}</dd>
            </>
          )}
          {seesExactCoords && (
            <>
              <dt>Координаты</dt>
              <dd className={s.coordsValue} data-testid="site-coords">
                {site.lat.toFixed(4)}, {site.lon.toFixed(4)}
              </dd>
            </>
          )}
        </dl>
      </Card>
      {!seesExactCoords && (
        <p className={s.closedCoords} data-testid="site-coords-closed">
          <Icon name="lock" size={1.3} />
          <span>
            На карте показан район ~500 м. Точные координаты видны только верифицированным
            поисковикам и краеведам.
          </span>
        </p>
      )}
      <p data-testid="site-volunteers">Готовы помочь: {site.volunteersReady}</p>
      <SourceList sources={site.sources} testID="site-sources" />
      <ShareButton
        title={`Последний бой: ${site.placeName}`}
        text="Нужна помощь в увековечении памяти бойцов"
        testID="site-share"
      />
      <p>
        <Link to="/last-battle">Все места на карте</Link>
      </p>
    </>
  )
}

export function SiteScreen() {
  const api = useApi()
  const { siteId = '' } = useParams()
  const location = useLocation()
  const site = useQuery({
    queryKey: ['sites', siteId],
    queryFn: () => api.getSite({ id: siteId }),
    retry: (count, error) => !isNotFound(error) && count < 1,
  })

  const notFound = site.isError && isNotFound(site.error)
  return (
    <Screen
      title={notFound ? 'Место не найдено' : (site.data?.placeName ?? 'Место гибели')}
      testID="screen-site"
    >
      {notFound ? (
        <p data-testid="site-not-found">
          Такого места нет или его удалили. <Link to="/last-battle">Все места на карте</Link>
        </p>
      ) : (
        <QueryState query={site} what="место">
          {(data) => <SiteCard site={data} notified={readNotified(location.state)} />}
        </QueryState>
      )}
    </Screen>
  )
}
