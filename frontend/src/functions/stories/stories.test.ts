// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createTestDeps } from '../../test/testDeps.ts'
import { isNotFound } from '../core/errors.ts'
import {
  awaitingReview,
  getStory,
  listStories,
  myStoriesIn,
  publishedStories,
  rememberStory,
  storyState,
} from './stories.ts'

describe('истории: список и карточка', () => {
  it('список — все истории, новые первыми', async () => {
    const list = await listStories(createTestDeps())
    const dates = list.map((x) => x.createdAt)
    expect([...dates].sort().reverse()).toEqual(dates)
    expect(list.map((x) => x.id)).toEqual(expect.arrayContaining(['ST01', 'ST02', 'ST03']))
  })

  it('история по id', async () => {
    const story = await getStory(createTestDeps(), 'ST01')
    expect(story.title).toBe('Памятник морякам-тихоокеанцам')
  })

  it('нет такой истории — ошибка 404', async () => {
    const error = await getStory(createTestDeps(), 'NOPE').catch((e: unknown) => e)
    expect(isNotFound(error)).toBe(true)
  })
})

describe('истории: очередь, проверенные, мои', () => {
  it('очередь проверки — ожидающие и на уточнении; проверенные — отдельно', async () => {
    const list = await listStories(createTestDeps())
    const awaiting = awaitingReview(list)
    const published = publishedStories(list)
    expect(awaiting.map((x) => x.id)).toEqual(expect.arrayContaining(['ST02', 'ST03']))
    expect(awaiting.every((x) => x.status === 'pending' || x.status === 'clarify')).toBe(true)
    expect(published.map((x) => x.id)).toContain('ST01')
    expect(published.every((x) => x.status === 'verified')).toBe(true)
    expect(awaiting.length + published.length).toBe(
      list.filter((x) => x.status !== 'rejected').length,
    )
  })

  it('«Мои истории» — только отправленные с устройства; пустая память — пусто', async () => {
    const list = await listStories(createTestDeps())
    expect(myStoriesIn(list, ['ST03', 'ST99']).map((x) => x.id)).toEqual(['ST03'])
    expect(myStoriesIn(list, [])).toEqual([])
  })

  it('запомнить историю: без повторов, новая — в конце', () => {
    expect(rememberStory([], 'A')).toEqual(['A'])
    expect(rememberStory(['A', 'B'], 'A')).toEqual(['B', 'A'])
  })

  it('подпись и тон статуса', () => {
    expect(storyState({ status: 'pending' })).toEqual({ label: 'Ожидает проверки', tone: 'wait' })
    expect(storyState({ status: 'clarify' })).toEqual({ label: 'Нужно уточнение', tone: 'action' })
    expect(storyState({ status: 'verified' })).toEqual({ label: 'Подтверждено', tone: 'done' })
    expect(storyState({ status: 'rejected' })).toEqual({ label: 'Отклонено', tone: 'action' })
  })
})
