import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { ShareButton } from '../../app/ShareButton.tsx'
import type { LastBattleSite, SiteStatus } from '../../contract/schemas.ts'
import { describeFighters, NOTIFY_RADIUS_KM } from '../../domain/lastBattle.ts'
import { useRole } from '../../app/RoleContext.tsx'
import { paths } from '../../functions/core/paths.ts'
import { can } from '../../functions/core/permissions.ts'
import {
  needsRaising as siteNeedsRaising,
  readNotified,
  statusActionFor,
  useHelpRaise,
  usePlace,
} from '../../functions/places/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { SourceList } from '../../ui/SourceList.tsx'
import { StatusBadge } from '../../ui/StatusBadge.tsx'
import { SiteStatusAction, StatusChanged } from './SiteStatusAction.tsx'
import s from './lastBattle.module.css'

function HelpAction({ site }: { site: LastBattleSite }) {
  const { done, busy, failed, help } = useHelpRaise(site.id)

  if (done) {
    return (
      <Notice tone="success" testID="site-help-done">
        <p>Спасибо! Командир отряда свяжется с вами перед выездом.</p>
        <Link to={paths.weekends()}>Выходные с поисковиком</Link> — подготовьтесь к первому выезду.
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
  const needsRaising = siteNeedsRaising(site)
  const roleId = useRole().role?.id
  const canAddPlace = can(roleId, 'place.create')
  // Защита от «чёрных копателей»: точные координаты — только поисковикам и краеведам.
  // Это витрина; настоящее скрытие должен делать сервер (docs/BACKEND_REQUESTS.md).
  const seesExactCoords = can(roleId, 'place.exactCoords')
  const statusAction = statusActionFor(roleId, site.status)
  // Проверка по архиву — главное дело краеведа на этом месте: большая кнопка у неё
  const confirmIsMain = statusAction === 'confirm'
  const [changedTo, setChangedTo] = useState<SiteStatus>()
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
      {canAddPlace ? (
        // Командир место и отметил — его главное действие: отметить следующее
        <BigButton to={paths.newSite()} icon="pin" testID="site-add-next">
          Отметить ещё одно место
        </BigButton>
      ) : (
        needsRaising && !confirmIsMain && <HelpAction site={site} />
      )}
      {changedTo && <StatusChanged status={changedTo} />}
      {statusAction && (
        <SiteStatusAction
          site={site}
          action={statusAction}
          main={confirmIsMain}
          onDone={setChangedTo}
        />
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
        <Link to={paths.lastBattle()}>Все места на карте</Link>
      </p>
    </>
  )
}

export function SiteScreen() {
  const { siteId = '' } = useParams()
  const location = useLocation()
  const { place: site, notFound } = usePlace(siteId)

  return (
    <Screen
      title={notFound ? 'Место не найдено' : (site.data?.placeName ?? 'Место гибели')}
      testID="screen-site"
    >
      {notFound ? (
        <p data-testid="site-not-found">
          Такого места нет или его удалили. <Link to={paths.lastBattle()}>Все места на карте</Link>
        </p>
      ) : (
        <QueryState query={site} what="место">
          {(data) => <SiteCard site={data} notified={readNotified(location.state)} />}
        </QueryState>
      )}
    </Screen>
  )
}
