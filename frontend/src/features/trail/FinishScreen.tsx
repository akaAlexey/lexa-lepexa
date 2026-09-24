import { useNavigate, useParams } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import type { Route } from '../../contract/schemas.ts'
import { paths } from '../../functions/core/paths.ts'
import {
  findRoute,
  finishSummary,
  POINT_ICON,
  useQuestProgress,
  useRoutes,
} from '../../functions/quest/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { SourceList } from '../../ui/SourceList.tsx'
import s from './trail.module.css'

/*
 * Внимание: на этом экране не пишем слово «точка» — в нём есть «очк», а финиш проверяется
 * на отсутствие «очков». Говорим «остановка» и «штамп».
 */
function Finish({ route }: { route: Route }) {
  const navigate = useNavigate()
  const { progress, restart } = useQuestProgress(route.id)
  const { status, stamps, sources } = finishSummary(route, progress)

  const again = () => {
    const to = restart(route)
    if (to) void navigate(to)
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
          {stamps.map(({ point: p, done }) => (
            <li key={p.id} className={done ? s.stamp : s.stampEmpty}>
              <Icon name={POINT_ICON[p.kind].icon} size={1.6} />
              <span>{p.title}</span>
              <span className="visually-hidden">
                {done ? '— штамп получен' : '— ещё не пройдено'}
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
        <SourceList sources={sources} testID="finish-sources" />
      </Card>

      <BigButton to={paths.trail()} icon="route" testID="finish-back">
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
        const route = findRoute(list, routeId)
        return route ? (
          <Finish route={route} />
        ) : (
          <Screen title="Маршрут не найден" testID="screen-finish-not-found">
            <BigButton to={paths.trail()} icon="route" testID="finish-back">
              К маршруту
            </BigButton>
          </Screen>
        )
      }}
    </QueryState>
  )
}
