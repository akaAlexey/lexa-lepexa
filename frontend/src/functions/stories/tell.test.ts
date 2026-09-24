// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createTestDeps } from '../../test/testDeps.ts'
import { checkForm } from '../core/form.ts'
import { storyForm, tellStory, wasSent, type StoryValues } from './tell.ts'

const filled: StoryValues = {
  title: ' Письмо прадеда ',
  place: 'Кромы',
  story: 'Прадед писал домой летом 1943 года, перед наступлением на Орёл.',
  sourceText: '  ',
  author: 'Семья Ивановых',
}

describe('рассказать историю: форма', () => {
  it('пустая форма — ошибки у обязательных полей, первое — название', () => {
    const check = checkForm(storyForm, storyForm.initial(), undefined)
    expect(check.ok).toBe(false)
    if (check.ok) return
    expect(Object.keys(check.errors).sort()).toEqual(['author', 'place', 'story', 'title'])
    expect(check.firstInvalid).toBe('title')
  })

  it('короткий рассказ — ошибка только у рассказа', () => {
    const check = checkForm(storyForm, { ...filled, story: 'Коротко' }, undefined)
    expect(check.ok).toBe(false)
    if (check.ok) return
    expect(check.errors).toEqual({ story: 'Расскажите подробнее — не короче 30 символов' })
    expect(check.firstInvalid).toBe('story')
  })

  it('верная форма — запрос без лишних пробелов, источник необязателен', () => {
    const check = checkForm(storyForm, filled, undefined)
    expect(check).toEqual({
      ok: true,
      request: { ...filled, title: 'Письмо прадеда', sourceText: '' },
    })
  })
})

describe('рассказать историю: отправка', () => {
  it('история уходит на проверку и видна по id', async () => {
    const deps = createTestDeps()
    const check = checkForm(storyForm, filled, undefined)
    if (!check.ok) throw new Error('форма должна быть верной')
    const created = await tellStory(deps, check.request)
    expect(created.status).toBe('pending')
    expect(created.id).toMatch(/^ST-/)
    expect((await deps.api.getStory({ id: created.id })).title).toBe('Письмо прадеда')
  })

  it('сбой связи — ошибка наружу (форма покажет «Не удалось отправить»)', async () => {
    const deps = createTestDeps()
    vi.spyOn(deps.api, 'createStory').mockRejectedValue(new Error('сеть'))
    await expect(tellStory(deps, { ...filled })).rejects.toThrow('сеть')
  })

  it('отметка «отправлено» в состоянии перехода', () => {
    expect(wasSent({ sent: true })).toBe(true)
    expect(wasSent(null)).toBe(false)
    expect(wasSent({})).toBe(false)
  })
})
