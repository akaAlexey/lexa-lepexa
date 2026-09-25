import { Fragment, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { ShareButton } from '../../app/ShareButton.tsx'
import type { Route, RoutePoint } from '../../contract/schemas.ts'
import { paths } from '../../functions/core/paths.ts'
import {
  afterPoint,
  findPoint,
  findRoute,
  POINT_ICON,
  useQuestProgress,
  useRoutes,
} from '../../functions/quest/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { SourceList } from '../../ui/SourceList.tsx'
import s from './trail.module.css'

type Answer = { index: number; correct: boolean }

/** Прогресс маршрута кружками из макета: пройденные — ✓, текущая — оранжевая. Для скринридера — текст «Точка N из M». */
function Stepper({
  route,
  index,
  done,
}: {
  route: Route
  index: number
  done: ReadonlySet<string>
}) {
  return (
    <ol className={s.stepper} aria-hidden="true">
      {route.points.map((p, i) => (
        <Fragment key={p.id}>
          {i > 0 && (
            <li className={done.has(route.points[i - 1]!.id) ? s.stepLineDone : s.stepLine} />
          )}
          <li
            className={i === index ? s.stepDotCurrent : done.has(p.id) ? s.stepDotDone : s.stepDot}
          >
            {i !== index && done.has(p.id) ? <Icon name="check" size={1.1} /> : i + 1}
          </li>
        </Fragment>
      ))}
    </ol>
  )
}

function PointCard({ route, point, index }: { route: Route; point: RoutePoint; index: number }) {
  const { done, answer: check } = useQuestProgress(route.id)
  const [answer, setAnswer] = useState<Answer>()
  const solved = answer?.correct === true
  const after = afterPoint(route, index)
  const kind = POINT_ICON[point.kind]

  // Ответ и кнопка «дальше» появляются под вариантами — на телефоне за краем экрана. Показываем их.
  const resultRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (answer) resultRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [answer])

  const choose = (optionIndex: number) => {
    setAnswer({ index: optionIndex, correct: check(point, optionIndex) })
  }

  return (
    <Screen
      title={point.title}
      back={
        <BackLink to={paths.trail()} testID="back-link">
          К маршруту
        </BackLink>
      }
      testID="screen-point"
    >
      <p className={s.step}>
        <Icon name={kind.icon} label={kind.label} />
        <span data-testid="point-step">
          Точка {index + 1} из {route.points.length}
        </span>
      </p>
      <Stepper route={route} index={index} done={done} />

      <Card as="section" aria-labelledby="point-story-title">
        <h2 id="point-story-title" className={s.cardTitle}>
          История места
        </h2>
        <p data-testid="point-story">{point.story}</p>
        <SourceList sources={point.sources} testID="point-sources" />
      </Card>
      <ShareButton
        title={`${point.title} — ${route.title}`}
        text="Точка семейного маршрута «Тропа памяти»"
        testID="point-share"
      />

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
              className={
                answer?.index === i ? (answer.correct ? s.optionRight : s.optionWrong) : s.option
              }
              aria-pressed={answer?.index === i}
              disabled={solved}
              onClick={() => choose(i)}
              data-testid={`task-option-${i}`}
            >
              {answer?.index === i && <Icon name={answer.correct ? 'check' : 'close'} size={1.3} />}
              {option}
              {answer?.index === i && (
                <span className="visually-hidden">
                  {answer.correct ? ' — верно' : ' — неверно'}
                </span>
              )}
            </button>
          ))}
        </div>
        {answer && (
          <Notice tone={answer.correct ? 'success' : 'error'} testID="task-feedback">
            {answer.correct ? (
              <>
                <strong className={s.feedbackTitle}>Верно!</strong> {point.task.explanation}
              </>
            ) : (
              <>
                <strong className={s.feedbackTitle}>Попробуй ещё раз</strong> Перечитай историю
                места — подсказка там.
              </>
            )}
          </Notice>
        )}
      </section>

      <div ref={resultRef}>
        {solved &&
          (!after.finish ? (
            <BigButton to={after.to} icon="route" testID="point-next">
              К следующей точке
            </BigButton>
          ) : (
            <BigButton to={after.to} icon="flag" testID="point-next">
              Завершить тропу
            </BigButton>
          ))}
      </div>
    </Screen>
  )
}

function PointNotFound() {
  return (
    <Screen
      title="Точка не найдена"
      back={
        <BackLink to={paths.trail()} testID="back-link">
          К маршруту
        </BackLink>
      }
      testID="screen-point-not-found"
    >
      <p>Такой точки на маршруте нет. Вернитесь к карте и выберите точку там.</p>
      <BigButton to={paths.trail()} icon="route" testID="point-back">
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
        const route = findRoute(list, routeId)
        const found = findPoint(route, pointId)
        if (!route || !found) return <PointNotFound />
        return (
          <PointCard key={found.point.id} route={route} point={found.point} index={found.index} />
        )
      }}
    </QueryState>
  )
}
