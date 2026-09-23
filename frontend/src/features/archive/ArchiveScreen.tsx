import { Link } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import type { ArchiveStory } from '../../contract/schemas.ts'
import { isAwaitingReview } from '../../domain/archive.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { StatePill } from '../../ui/StatePill.tsx'
import s from './archive.module.css'
import { storyState, storyUrl, useCanVerify, useMyStories, useStories } from './stories.ts'

function StoryList({ label, stories }: { label: string; stories: ArchiveStory[] }) {
  return (
    <ul aria-label={label} className="stack-list">
      {stories.map((story) => {
        const state = storyState(story)
        return (
          <Card as="li" key={story.id} testID={`story-${story.id}`}>
            <Link to={storyUrl(story.id)} className={s.storyLink}>
              <h3>{story.title}</h3>
            </Link>
            <p className={s.meta}>
              {story.place} · {story.author}
            </p>
            <p className={s.badges}>
              <StatePill label={state.label} tone={state.tone} /> {story.demo && <DemoBadge />}
            </p>
          </Card>
        )
      })}
    </ul>
  )
}

/**
 * «Истории» — народный архив из макета: люди рассказывают о родных и местах,
 * краевед или отряд проверяет по источникам, и только тогда история видна всем.
 */
export function ArchiveScreen() {
  const stories = useStories()
  const canVerify = useCanVerify()
  const mine = useMyStories()
  return (
    <Screen
      title="Истории"
      lead="Семейные рассказы и воспоминания о войне на Орловщине. Каждую историю проверяет краевед по источникам"
      testID="screen-archive"
    >
      <QueryState query={stories} what="истории">
        {(list) => {
          const awaiting = list.filter(isAwaitingReview)
          const published = list.filter((x) => x.status === 'verified')
          const my = list.filter((x) => mine.ids.includes(x.id))
          return (
            <>
              {canVerify && awaiting[0] ? (
                <BigButton to={storyUrl(awaiting[0].id)} icon="check" testID="archive-review-next">
                  Проверить истории · {awaiting.length}
                </BigButton>
              ) : (
                <BigButton to="/archive/new" icon="story" testID="archive-new">
                  Рассказать историю
                </BigButton>
              )}
              {canVerify ? (
                <section aria-labelledby="archive-queue">
                  <h2 id="archive-queue">Ждут проверки</h2>
                  {awaiting.length > 0 ? (
                    <StoryList label="Ждут проверки" stories={awaiting} />
                  ) : (
                    <Notice>Новых историй на проверке нет.</Notice>
                  )}
                </section>
              ) : (
                my.length > 0 && (
                  <section aria-labelledby="archive-mine">
                    <h2 id="archive-mine">Мои истории</h2>
                    <StoryList label="Мои истории" stories={my} />
                  </section>
                )
              )}
              <section aria-labelledby="archive-published">
                <h2 id="archive-published">Проверенные истории</h2>
                <StoryList label="Проверенные истории" stories={published} />
              </section>
            </>
          )
        }}
      </QueryState>
    </Screen>
  )
}
