import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../../api/client.ts'
import { QueryState } from '../../app/QueryState.tsx'
import { ShareButton } from '../../app/ShareButton.tsx'
import { useRole } from '../../app/RoleContext.tsx'
import { useApi } from '../../app/services.tsx'
import type { ArchiveStory } from '../../contract/schemas.ts'
import {
  REVIEW_CHECKS,
  isAwaitingReview,
  reviewBlocker,
  type ReviewCheckId,
} from '../../domain/archive.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { TextAreaField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { StatePill } from '../../ui/StatePill.tsx'
import s from './archive.module.css'
import type { StorySentState } from './NewStoryScreen.tsx'
import { qk, storyState, useCanVerify } from './stories.ts'

const isNotFound = (e: unknown) => e instanceof ApiError && e.status === 404

const wasSent = (state: unknown) => (state as Partial<StorySentState> | null)?.sent === true

/** Чек-лист и решение проверяющего — как экран «Проверка источника» на макете. */
function ReviewPanel({ story }: { story: ArchiveStory }) {
  const api = useApi()
  const queryClient = useQueryClient()
  const { role } = useRole()
  const [checks, setChecks] = useState<ReviewCheckId[]>([])
  const [note, setNote] = useState('')
  const [blocker, setBlocker] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggle = (id: ReviewCheckId) =>
    setChecks((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const decide = async (decision: 'verified' | 'clarify') => {
    const problem = reviewBlocker(decision, { source: story.sourceText, checks, note })
    setBlocker(problem)
    setSaved(false)
    if (problem) return
    setBusy(true)
    try {
      const updated = await api.reviewStory({
        id: story.id,
        body: { decision, reviewer: role?.short ?? 'Проверяющий', note: note.trim() },
      })
      queryClient.setQueryData(qk.story(story.id), updated)
      queryClient.setQueryData<ArchiveStory[]>(qk.stories, (old) =>
        old?.map((x) => (x.id === updated.id ? updated : x)),
      )
      setSaved(true)
    } catch {
      setBlocker('Не удалось сохранить решение. Проверьте связь и попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card as="section" aria-labelledby="review-title">
      <h2 id="review-title">Проверка</h2>
      <fieldset className={s.checks}>
        <legend>Что сверено с источниками</legend>
        {REVIEW_CHECKS.map((c) => (
          <label key={c.id} className={s.check}>
            <input
              type="checkbox"
              checked={checks.includes(c.id)}
              onChange={() => toggle(c.id)}
              data-testid={`review-check-${c.id}`}
            />
            <span>{c.label}</span>
          </label>
        ))}
      </fieldset>
      <TextAreaField
        label="Комментарий автору"
        hint="Что уточнить или на чём основано решение"
        value={note}
        onChange={setNote}
        rows={3}
        testID="review-note"
      />
      {saved && (
        <Notice tone="success" testID="review-saved">
          Решение сохранено. Автор увидит комментарий на странице истории.
        </Notice>
      )}
      {blocker && (
        <Notice tone="error" testID="review-blocker">
          {blocker}
        </Notice>
      )}
      <div className={s.actions}>
        <BigButton
          onClick={() => void decide('verified')}
          disabled={busy}
          icon="check"
          testID="review-verify"
        >
          Подтвердить
        </BigButton>
        <Button onClick={() => void decide('clarify')} disabled={busy} testID="review-clarify">
          Нужно уточнение
        </Button>
      </div>
    </Card>
  )
}

function StoryCard({ story, sent }: { story: ArchiveStory; sent: boolean }) {
  const canVerify = useCanVerify()
  const state = storyState(story)
  const reviewable = canVerify && isAwaitingReview(story)
  return (
    <>
      {sent && (
        <Notice tone="success" testID="story-sent">
          История отправлена на проверку. Статус виден здесь и в разделе «Истории».
        </Notice>
      )}
      <p className={s.badges}>
        <StatePill label={state.label} tone={state.tone} testID="story-status" />{' '}
        {story.demo && <DemoBadge />}
      </p>
      <Card as="section" aria-labelledby="story-text">
        <h2 id="story-text" className="visually-hidden">
          Рассказ
        </h2>
        <p className={s.meta}>
          {story.place} · {story.author}
        </p>
        <p className={s.body} data-testid="story-body-text">
          {story.story}
        </p>
        <p className={s.source} data-testid="story-source-text">
          Источник: {story.sourceText.trim() || 'не указан'}
        </p>
      </Card>
      {story.reviewNote && (
        <Notice tone={story.status === 'verified' ? 'success' : 'info'} testID="story-review-note">
          <strong>
            Комментарий проверяющего{story.verifiedBy ? ` (${story.verifiedBy})` : ''}:
          </strong>{' '}
          {story.reviewNote}
        </Notice>
      )}
      {story.status === 'verified' && story.verifiedBy && !story.reviewNote && (
        <p className={s.meta} data-testid="story-verified-by">
          Проверил: {story.verifiedBy}
        </p>
      )}
      {story.status === 'verified' && (
        <ShareButton
          title={story.title}
          text="История из народного архива «Тропа памяти»"
          testID="story-share"
        />
      )}
      {reviewable ? (
        <ReviewPanel story={story} />
      ) : (
        <BigButton to="/archive/new" icon="story" testID="story-tell-own">
          Рассказать свою историю
        </BigButton>
      )}
      <p>
        <Link to="/archive">Все истории</Link>
      </p>
    </>
  )
}

export function StoryScreen() {
  const api = useApi()
  const { storyId = '' } = useParams()
  const location = useLocation()
  const story = useQuery({
    queryKey: qk.story(storyId),
    queryFn: () => api.getStory({ id: storyId }),
    retry: (count, e) => !isNotFound(e) && count < 1,
  })
  const notFound = story.isError && isNotFound(story.error)
  return (
    <Screen
      title={notFound ? 'История не найдена' : (story.data?.title ?? 'История')}
      testID="screen-story"
    >
      {notFound ? (
        <p data-testid="story-not-found">
          Такой истории нет. <Link to="/archive">Все истории</Link>
        </p>
      ) : (
        <QueryState query={story} what="историю">
          {(data) => <StoryCard story={data} sent={wasSent(location.state)} />}
        </QueryState>
      )}
    </Screen>
  )
}
