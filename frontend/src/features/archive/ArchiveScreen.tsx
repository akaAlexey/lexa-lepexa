import { Link } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { useRole } from '../../app/RoleContext.tsx'
import type { ArchiveStory } from '../../contract/schemas.ts'
import { storyYears } from '../../domain/archive.ts'
import { paths } from '../../functions/core/paths.ts'
import { can } from '../../functions/core/permissions.ts'
import {
  awaitingReview,
  myStoriesIn,
  publishedStories,
  storyState,
  useMyStories,
  useStories,
} from '../../functions/stories/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { StatePill } from '../../ui/StatePill.tsx'
import s from './archive.module.css'

/** «Книга памяти» (ADR 0012): строка — год, название, место и подпись, статус справа. */
function StoryList({ label, stories }: { label: string; stories: ArchiveStory[] }) {
  return (
    <ul aria-label={label} className={s.book}>
      {stories.map((story) => {
        const state = storyState(story)
        return (
          <li key={story.id} className={s.row} data-testid={`story-${story.id}`}>
            <span className={s.year}>{storyYears(story)}</span>
            <span className={s.rowMain}>
              <Link to={paths.story(story.id)} className={s.storyLink}>
                <h3>{story.title}</h3>
              </Link>
              <span className={s.meta}>
                {story.place} · {story.author}
              </span>
            </span>
            <span className={s.badges}>
              <StatePill label={state.label} tone={state.tone} /> {story.demo && <DemoBadge />}
            </span>
          </li>
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
  const { role } = useRole()
  const canVerify = can(role?.id, 'story.verify')
  const mine = useMyStories()
  return (
    <Screen
      title="Книга памяти"
      lead="Истории семей и краеведов об Орловщине в войну. Каждую проверяет краевед или поисковый отряд"
      testID="screen-archive"
    >
      <QueryState query={stories} what="истории">
        {(list) => {
          const awaiting = awaitingReview(list)
          const published = publishedStories(list)
          const my = myStoriesIn(list, mine)
          return (
            <>
              {canVerify && awaiting[0] && (
                <BigButton
                  to={paths.story(awaiting[0].id)}
                  icon="check"
                  testID="archive-review-next"
                >
                  Проверить истории · {awaiting.length}
                </BigButton>
              )}
              {/* Хроника — компактная заметная плашка */}
              <Link
                to={paths.chronicle()}
                className={s.chronicleBar}
                data-testid="archive-chronicle"
              >
                <Icon name="star" size={1.2} />
                <span>
                  <span className={s.chronicleTitle}>Хроника и памятники</span>
                  <span className={s.chronicleText}>Бои 1941–1943 и памятники на карте</span>
                </span>
                <Icon name="chevron" size={1.1} className={s.chronicleArrow} />
              </Link>
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
                {published.length > 0 ? (
                  <StoryList label="Проверенные истории" stories={published} />
                ) : (
                  <Notice>
                    Проверенных историй пока нет. Вы можете рассказать историю своей семьи.
                  </Notice>
                )}
              </section>
            </>
          )
        }}
      </QueryState>
    </Screen>
  )
}
