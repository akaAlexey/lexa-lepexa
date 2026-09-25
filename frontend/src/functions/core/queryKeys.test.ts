// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { qk } from './queryKeys.ts'

describe('ключи кэша', () => {
  it('совпадают с прежними ключами экранов', () => {
    expect({
      routes: qk.routes,
      sites: qk.sites,
      site: qk.site('S01'),
      graves: qk.graves,
      battles: qk.battles,
      teams: qk.teams,
      requests: qk.requests,
      fundraisers: qk.fundraisers,
      trips: qk.trips,
      trip: qk.trip('W01'),
      groupApplications: qk.groupApplications,
      stories: qk.stories,
      story: qk.story('ST01'),
    }).toEqual({
      routes: ['routes'],
      sites: ['sites'],
      site: ['sites', 'S01'],
      graves: ['graves'],
      battles: ['battles'],
      teams: ['teams'],
      requests: ['requests'],
      fundraisers: ['fundraisers'],
      trips: ['trips'],
      trip: ['trip', 'W01'],
      groupApplications: ['group-applications'],
      stories: ['stories'],
      story: ['stories', 'ST01'],
    })
  })

  it('списки не совпадают друг с другом', () => {
    const lists = Object.values(qk).filter((k) => typeof k !== 'function')
    const names = lists.map((k) => JSON.stringify(k))
    expect(new Set(names).size).toBe(names.length)
  })

  it('карточка места и истории лежит под своим списком: инвалидация списка обновляет и её', () => {
    expect(qk.site('S01').slice(0, 1)).toEqual(qk.sites)
    expect(qk.story('ST01').slice(0, 1)).toEqual(qk.stories)
  })
})
