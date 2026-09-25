// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { can, type Action, type RoleId } from './permissions.ts'

const ROLES: RoleId[] = ['family', 'volunteer', 'commander', 'verifier']

/** Таблица прав: действие → роли, которым оно доступно. Совпадает с тем, что экраны делают сейчас. */
const EXPECTED: Record<Action, RoleId[]> = {
  'request.create': ['commander'],
  'request.join': ['volunteer'],
  'place.create': ['commander'],
  'place.exactCoords': ['commander', 'verifier'],
  'place.confirmArchive': ['verifier'],
  'place.markRaised': ['commander'],
  'story.verify': ['commander', 'verifier'],
  'group.decide': ['commander'],
}

describe('права ролей', () => {
  for (const [action, allowed] of Object.entries(EXPECTED) as [Action, RoleId[]][]) {
    it(`${action}: ${allowed.join(', ')}`, () => {
      expect(ROLES.filter((r) => can(r, action))).toEqual(allowed)
    })
  }

  it('без выбранной роли ничего из списка недоступно', () => {
    for (const action of Object.keys(EXPECTED) as Action[])
      expect(can(undefined, action)).toBe(false)
  })
})
