import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ArchiveStory } from '../../contract/schemas.ts'
import type { ReviewCheckId } from '../../domain/archive.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { reviewProblem, reviewStory, toggleCheck, type ReviewDecision } from './review.ts'

export interface ReviewState {
  reviewer: string
  setReviewer(name: string): void
  checks: readonly ReviewCheckId[]
  toggle(id: ReviewCheckId): void
  note: string
  setNote(note: string): void
  /** Почему решение не принято: не хватает пунктов, комментария или связи. */
  blocker: string | undefined
  busy: boolean
  /** Решение сохранено. */
  saved: boolean
  decide(decision: ReviewDecision): void
}

/** Проверка истории краеведом: чек-лист, комментарий, решение и обновление кэша. */
export function useReview(story: ArchiveStory, initialReviewer: string): ReviewState {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const [reviewer, setReviewer] = useState(initialReviewer)
  const [checks, setChecks] = useState<ReviewCheckId[]>([])
  const [note, setNote] = useState('')
  const [blocker, setBlocker] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const decide = async (decision: ReviewDecision) => {
    const input = { story, decision, checks, note, reviewer }
    const problem = reviewProblem(input)
    setBlocker(problem)
    setSaved(false)
    if (problem) return
    setBusy(true)
    const result = await reviewStory(deps, input)
    setBusy(false)
    if (!result.ok) {
      setBlocker(result.reason)
      return
    }
    const updated = result.story
    queryClient.setQueryData(qk.story(story.id), updated)
    queryClient.setQueryData<ArchiveStory[]>(qk.stories, (old) =>
      old?.map((x) => (x.id === updated.id ? updated : x)),
    )
    setSaved(true)
  }

  return {
    reviewer,
    setReviewer,
    checks,
    toggle: (id) => setChecks((prev) => toggleCheck(prev, id)),
    note,
    setNote,
    blocker,
    busy,
    saved,
    decide: (decision) => void decide(decision),
  }
}
