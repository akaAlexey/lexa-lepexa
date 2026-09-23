import { useNavigate, useParams } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import type { Route, Source } from '../../contract/schemas.ts'
import { questStatus } from '../../domain/trail.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { SourceList } from '../../ui/SourceList.tsx'
import { POINT_ICON } from './pointKinds.ts'
import s from './trail.module.css'
import { pointUrl, useQuestProgress, useRoutes } from './useTrail.ts'

/** Источники всех остановок без повторов и без пометок «демо-текст». */
function routeSources(route: Route): Source[] {
  const all = route.points.flatMap((p) => p.sources).filter((src) => src.kind !== 'demo')
  return all.filter((src, i) => all.findIndex((x) => x.title === src.title) === i)
}

/*
 * Внимание: на этом экране не пишем слово «точка» — в нём есть «очк», а финиш проверяется
 * на отсутствие «очков». Говорим «остановка» и «штамп».
 */
function Finish({ route }: { route: Route }) {
  const navigate = useNavigate()
  const { progress, reset } = useQuestProgress(route.id)
  const status = questStatus(route, progress)
  const done = new Set(progress.donePointIds)

  const again = () => {
    reset()
    const first = route.points[0]
    if (first) void navigate(pointUrl(route.id, first.id))
  }

  return (
    <Screen title="Тропа пройдена!" lead={`Вы прошли «${route.title}»`} testID="screen-finish">
      <Card as="section" aria-labelledby="stamps-title">
        <h2 id="stamps-title" className={s.cardTitle}>
          Штампы маршрута
        </h2>
        <p className={s.stampsCount} data-testid="finish-stamps">
          {status.done} из {status.total}
        </p>
        <ul className={s.stamps}>
          {route.points.map((p) => (
            <li key={p.id} className={done.has(p.id) ? s.stamp : s.stampEmpty}>
              <Icon name={POINT_ICON[p.kind].icon} size={2} />
              <span>{p.title}</span>
              <span className="visually-hidden">
                {done.has(p.id) ? '— штамп получен' : '— ещё не пройдено'}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card as="section" aria-labelledby="thanks-title">
        <h2 id="thanks-title" className={s.cardTitle}>
          Спасибо, что помните
        </h2>
        <p>
          Осенью 1941 года десантники 5-го корпуса ценой жизни задержали врага под Орлом, а 5
          августа 1943 года город освободили — и Москва впервые салютовала в его честь. Многие из
          тех, кто здесь воевал, до сих пор не найдены. Расскажите дома, что узнали сегодня, и
          спросите у старших, где воевали ваши прадеды.
        </p>
        <SourceList sources={routeSources(route)} testID="finish-sources" />
      </Card>

      <BigButton to="/trail" icon="route" testID="finish-back">
        Вернуться к карте
      </BigButton>
      <Button onClick={again} icon="flag" testID="finish-again">
        Пройти ещё раз
      </Button>
    </Screen>
  )
}

export function FinishScreen() {
  const { routeId } = useParams()
  const routes = useRoutes()
  return (
    <QueryState query={routes} what="маршрут">
      {(list) => {
        const route = list.find((r) => r.id === routeId)
        return route ? (
          <Finish route={route} />
        ) : (
          <Screen title="Маршрут не найден" testID="screen-finish-not-found">
            <BigButton to="/trail" icon="route" testID="finish-back">
              К маршруту
            </BigButton>
          </Screen>
        )
      }}
    </QueryState>
  )
}
