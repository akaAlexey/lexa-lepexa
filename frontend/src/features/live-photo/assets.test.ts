// @vitest-environment node
/// <reference types="node" />
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { livePhotos } from '../../api/fixtures/seed.ts'
import { describeCameraError } from './arErrors.ts'

const PUBLIC = join(process.cwd(), 'public')
const file = (url: string) => join(PUBLIC, url.replace(/^\//, ''))

/** Разбор WebVTT: реплики с временем начала и конца в секундах. */
function parseVtt(text: string) {
  const time = (t: string) => {
    const parts = t.split(':').map(Number)
    return parts.reduce((acc, p) => acc * 60 + p, 0)
  }
  return [...text.matchAll(/([\d:.]+)\s+-->\s+([\d:.]+)[^\n]*\n([\s\S]*?)(?:\n\n|\n*$)/g)].map(
    ([, start, end, cue]) => ({ start: time(start!), end: time(end!), text: cue!.trim() }),
  )
}

describe('«Живое фото»: файлы в public/live', () => {
  for (const photo of livePhotos) {
    describe(`снимок «${photo.id}»`, () => {
      it('снимок, ролик, субтитры и цель камеры лежат в public и не пустые', () => {
        const urls = [photo.photoUrl, photo.videoUrl, photo.captionsUrl, photo.targetUrl]
        expect(urls.every((url) => /^\/?live\//.test(url))).toBe(true)
        expect(urls.filter((url) => !existsSync(file(url)))).toEqual([])
        expect(urls.filter((url) => statSync(file(url)).size < 100)).toEqual([])
      })

      it('русские субтитры: WEBVTT, реплики по порядку, время не перекрывается', () => {
        const vtt = readFileSync(file(photo.captionsUrl), 'utf8')
        expect(vtt.startsWith('WEBVTT')).toBe(true)
        const cues = parseVtt(vtt)
        expect(cues.length).toBeGreaterThan(2)
        expect(cues.filter((cue) => cue.end <= cue.start)).toEqual([])
        expect(cues.filter((cue) => !/[А-Яа-яЁё]/.test(cue.text))).toEqual([])
        expect(cues.filter((cue, i) => i > 0 && cue.start < cues[i - 1]!.end)).toEqual([])
      })

      it('ролик в mp4 с moov в начале — телефон начинает играть до полной загрузки', () => {
        const head = readFileSync(file(photo.videoUrl))
          .subarray(0, 64 * 1024)
          .toString('latin1')
        expect(head.slice(4, 8)).toBe('ftyp')
        expect(head.indexOf('moov')).toBeGreaterThan(-1)
        const mdat = head.indexOf('mdat')
        expect(mdat === -1 || head.indexOf('moov') < mdat).toBe(true)
      })
    })
  }
})

describe('причины, по которым камера не включилась', () => {
  it.each([
    ['NotAllowedError', 'запрещён'],
    ['SecurityError', 'запрещён'],
    ['NotFoundError', 'не нашлась'],
    ['OverconstrainedError', 'не нашлась'],
    ['NotReadableError', 'занята'],
    ['TimeoutError', '20 секунд'],
  ])('%s → «…%s…»', (name, text) => {
    expect(describeCameraError(new DOMException('x', name))).toContain(text)
  })

  it('своя ошибка — её текст, неизвестное — общая фраза', () => {
    expect(describeCameraError(new Error('Камера работает только на защищённом адресе'))).toContain(
      'защищённом',
    )
    expect(describeCameraError('???')).toBe('Не удалось включить камеру')
  })
})
