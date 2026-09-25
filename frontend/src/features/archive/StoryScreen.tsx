import { useLocation, useParams } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { ShareButton } from '../../app/ShareButton.tsx'
import { useRole } from '../../app/RoleContext.tsx'
import type { ArchiveStory } from '../../contract/schemas.ts'
import { storyYears } from '../../domain/archive.ts'
import { isNotFound } from '../../functions/core/errors.ts'
import { paths } from '../../functions/core/paths.ts'
import { can } from '../../functions/core/permissions.ts'
import {
  REVIEW_CHECKS,
  isAwaitingReview,
  storyState,
  useMyStories,
  useReview,
  useStory,
  wasSent,
} from '../../functions/stories/index.ts'
import { BackLink } from '../../ui/BackLink.tsx'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { TextAreaField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { StatePill } from '../../ui/StatePill.tsx'
import s from './archive.module.css'
import { ArchivePhotos } from './ArchivePhotos.tsx'
import { StoryImages } from './StoryImages.tsx'

/** Чек-лист и решение проверяющего — как экран «Проверка источника» на макете. */
function ReviewPanel({ story }: { story: ArchiveStory }) {
  const { role } = useRole()
  const review = useReview(story, role?.short ?? 'Проверяющий')
  const { checks, note, saved, blocker, busy } = review

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
              onChange={() => review.toggle(c.id)}
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
        onChange={review.setNote}
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
          onClick={() => review.decide('verified')}
          disabled={busy}
          icon="check"
          testID="review-verify"
        >
          Подтвердить
        </BigButton>
        <Button onClick={() => review.decide('clarify')} disabled={busy} testID="review-clarify">
          Нужно уточнение
        </Button>
      </div>
    </Card>
  )
}

function StoryCard({ story, sent }: { story: ArchiveStory; sent: boolean }) {
  const { role } = useRole()
  const canVerify = can(role?.id, 'story.verify')
  const state = storyState(story)
  const reviewable = canVerify && isAwaitingReview(story)
  const mine = useMyStories()
  // Фото добавляет автор; к истории «Нужно уточнение» — и семья (краевед просит фото письма)
  const canAddImages = mine.includes(story.id) || story.status === 'clarify'
  const years = storyYears(story)
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
          {years && <span className={s.yearInline}>{years} · </span>}
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
      {story.photos && story.photos.length > 0 && <ArchivePhotos photos={story.photos} />}
      <StoryImages storyId={story.id} canAdd={canAddImages} />
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
        <BigButton to={paths.newStory()} icon="story" testID="story-tell-own">
          Рассказать свою историю
        </BigButton>
      )}
    </>
  )
}

export function StoryScreen() {
  const { storyId = '' } = useParams()
  const location = useLocation()
  const story = useStory(storyId)
  const notFound = story.isError && isNotFound(story.error)
  return (
    <Screen
      title={notFound ? 'История не найдена' : (story.data?.title ?? 'История')}
      back={
        <BackLink to={paths.archive()} testID="back-to-stories">
          К историям
        </BackLink>
      }
      testID="screen-story"
    >
      {notFound ? (
        <p data-testid="story-not-found">Такой истории нет. Вернитесь к списку историй.</p>
      ) : (
        <QueryState query={story} what="историю">
          {(data) => <StoryCard story={data} sent={wasSent(location.state)} />}
        </QueryState>
      )}
    </Screen>
  )
}
