import { matchPath, type RouteObject } from 'react-router'
import { describe, expect, it } from 'vitest'
import { appRoutes } from '../../app/routes.tsx'
import { familyFighter, paths, patterns, type ScreenId } from './paths.ts'

/** Все адреса маршрутов приложения с ведущим «/». */
function routePaths(routes: RouteObject[], base = ''): string[] {
  return routes.flatMap((r) => {
    const own = r.index ? base || '/' : r.path ? `${base}/${r.path}`.replace(/\/+/g, '/') : base
    const self = r.path || r.index ? [own] : []
    return [...self, ...routePaths(r.children ?? [], own)]
  })
}

const SAMPLE: Record<ScreenId, string> = {
  home: paths.home(),
  roles: paths.roles(),
  map: paths.map(),
  events: paths.events(),
  other: paths.other(),
  trail: paths.trail(),
  point: paths.point('park-3km', 'okop'),
  finish: paths.finish('park-3km'),
  search: paths.search(),
  newRequest: paths.newRequest(),
  weekends: paths.weekends(),
  trip: paths.trip('W01'),
  tripGroup: paths.tripGroup('W01'),
  lastBattle: paths.lastBattle(),
  newSite: paths.newSite(),
  site: paths.site('S01'),
  archive: paths.archive(),
  newStory: paths.newStory(),
  story: paths.story('ST01'),
  chronicle: paths.chronicle(),
  livePhotos: paths.livePhotos(),
  newLivePhoto: paths.newLivePhoto(),
  livePhoto: paths.livePhoto('soldier'),
  demo: paths.demo(),
  payment: paths.payment(),
  about: paths.about(),
  privacy: paths.privacy(),
  terms: paths.terms(),
}

describe('адреса экранов', () => {
  it('прежние адреса из QR-кодов и «Поделиться» живы, у разделов ADR 0012 свои адреса', () => {
    expect(SAMPLE).toEqual({
      home: '/',
      roles: '/roles',
      map: '/map',
      events: '/events',
      other: '/other',
      trail: '/trail',
      point: '/trail/park-3km/point/okop',
      finish: '/trail/park-3km/finish',
      search: '/search',
      newRequest: '/search/requests/new',
      weekends: '/weekends',
      trip: '/weekends/W01',
      tripGroup: '/weekends/W01/group',
      lastBattle: '/last-battle',
      newSite: '/last-battle/new',
      site: '/last-battle/S01',
      archive: '/archive',
      newStory: '/archive/new',
      story: '/archive/ST01',
      chronicle: '/chronicle',
      livePhotos: '/live',
      newLivePhoto: '/live/new',
      livePhoto: '/live/soldier',
      demo: '/demo',
      payment: '/payment',
      about: '/about',
      privacy: '/privacy',
      terms: '/terms',
    })
  })

  it('каждая ссылка подходит под свой шаблон и не подходит под чужой статический', () => {
    for (const [id, url] of Object.entries(SAMPLE) as [ScreenId, string][]) {
      expect(matchPath(patterns[id], url), `${id}: ${url}`).not.toBeNull()
    }
    expect(matchPath(patterns.site, paths.newSite())).not.toBeNull() // поэтому new объявлен раньше :siteId
  })

  it('id с пробелами и слэшами кодируются, адрес не ломается', () => {
    expect(paths.site('a b/c')).toBe('/last-battle/a%20b%2Fc')
  })

  it('карточка бойца семейного архива — раздел «Другого» с параметром fighter', () => {
    expect(familyFighter('F-1')).toBe('/other?section=archive&fighter=F-1')
    expect(familyFighter('F-1', true)).toBe('/other?section=archive&fighter=F-1&edit=1')
    expect(familyFighter('a&b')).toBe('/other?section=archive&fighter=a%26b')
  })

  it('каждый маршрут роутера описан шаблоном, и наоборот', () => {
    const routes = routePaths(appRoutes).filter((p) => p !== '/*')
    expect([...routes].sort()).toEqual([...Object.values(patterns)].sort())
  })
})
