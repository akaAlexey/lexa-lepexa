import { useState } from 'react'
import { useParams } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import type { Route, RoutePoint } from '../../contract/schemas.ts'
import { checkAnswer } from '../../domain/trail.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { SourceList } from '../../ui/SourceList.tsx'
import { POINT_ICON } from './pointKinds.ts'
import s from './trail.module.css'
import { finishUrl, pointUrl, useQuestProgress, useRoutes } from './useTrail.ts'

type Answer = { index: number; correct: boolean }

function PointCard({ route, point, index }: { route: Route; point: RoutePoint; index: number }) {
  const { markDone } = useQuestProgress(route.id)
  const [answer, setAnswer] = useState<Answer>()
  const solved = answer?.correct === true
  const next = route.points[index + 1]
  const kind = POINT_ICON[point.kind]

  const choose = (optionIndex: number) => {
    const correct = checkAnswer(point, optionIndex)
    setAnswer({ index: optionIndex, correct })
    if (correct) markDone(point.id)
  }

  return (
    <Screen title={point.title} testID="screen-point">
      <p className={s.step}>
        <Icon name={kind.icon} label={kind.label} />
        <span data-testid="point-step">
          Точка {index + 1} из {route.points.length}
        </span>
        {route.demo && <DemoBadge />}
      </p>

      <Card as="section" aria-labelledby="point-story-title">
        <h2 id="point-story-title" className={s.cardTitle}>
          История места
        </h2>
        <p data-testid="point-story">{point.story}</p>
        <SourceList sources={point.sources} testID="point-sources" />
      </Card>

      <section
        className={s.task}
        aria-labelledby="task-title"
        data-testid="task"
        data-main-action={solved ? undefined : ''}
      >
        <h2 id="task-title" className={s.cardTitle}>
          <Icon name="question" /> Задание
        </h2>
        <p className={s.question} data-testid="task-question">
          {point.task.question}
        </p>
        <div className={s.options} role="group" aria-label="Варианты ответа">
          {point.task.options.map((option, i) => (
            <button
              key={option}
              type="button"
              className={s.option}
              aria-pressed={answer?.index === i}
              disabled={solved}
              onClick={() => choose(i)}
              data-testid={`task-option-${i}`}
            >
              {option}
            </button>
          ))}
        </div>
        {answer && (
          <Notice tone={answer.correct ? 'success' : 'error'} testID="task-feedback">
            {answer.correct ? (
              <>
                <strong className={s.feedbackTitle}>
                  <Icon name="check" /> Верно!
                </strong>{' '}
                {point.task.explanation}
              </>
            ) : (
              <>
                <strong className={s.feedbackTitle}>
                  <Icon name="question" /> Попробуй ещё раз
                </strong>{' '}
                Перечитай историю места — подсказка там.
              </>
            )}
          </Notice>
        )}
      </section>

      {solved &&
        (next ? (
          <BigButton to={pointUrl(route.id, next.id)} icon="route" testID="point-next">
            К следующей точке
          </BigButton>
        ) : (
          <BigButton to={finishUrl(route.id)} icon="flag" testID="point-next">
            Завершить тропу
          </BigButton>
        ))}
    </Screen>
  )
}

function PointNotFound() {
  return (
    <Screen title="Точка не найдена" testID="screen-point-not-found">
      <p>Такой точки на маршруте нет. Вернитесь к карте и выберите точку там.</p>
      <BigButton to="/trail" icon="route" testID="point-back">
        К маршруту
      </BigButton>
    </Screen>
  )
}

export function PointScreen() {
  const { routeId, pointId } = useParams()
  const routes = useRoutes()
  return (
    <QueryState query={routes} what="маршрут">
      {(list) => {
        const route = list.find((r) => r.id === routeId)
        const index = route?.points.findIndex((p) => p.id === pointId) ?? -1
        const point = route?.points[index]
        if (!route || !point) return <PointNotFound />
        return <PointCard key={point.id} route={route} point={point} index={index} />
      }}
    </QueryState>
  )
}
