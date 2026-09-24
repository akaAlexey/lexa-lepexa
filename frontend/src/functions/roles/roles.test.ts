// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createTestDeps } from '../../test/testDeps.ts'
import { chooseRole, forgetRole, isRoleId, savedRole } from './roles.ts'

describe('роль без регистрации', () => {
  it('без выбора роли нет', () => {
    expect(savedRole(createTestDeps())).toBeUndefined()
  })

  it('выбранная роль запоминается под прежним ключом', () => {
    const deps = createTestDeps()
    chooseRole(deps, 'commander')
    expect(savedRole(deps)).toBe('commander')
    expect(deps.platform.storage.get('role')).toBe('commander')
  })

  it('роль, сохранённая старой версией, читается', () => {
    expect(savedRole(createTestDeps({ stored: { role: 'verifier' } }))).toBe('verifier')
  })

  it('неизвестная роль на устройстве — роль не выбрана', () => {
    expect(savedRole(createTestDeps({ stored: { role: 'admin' } }))).toBeUndefined()
    expect(isRoleId(42)).toBe(false)
  })

  it('сброс забывает роль', () => {
    const deps = createTestDeps({ stored: { role: 'family' } })
    forgetRole(deps)
    expect(savedRole(deps)).toBeUndefined()
    expect(deps.platform.storage.get('role')).toBeUndefined()
  })
})
