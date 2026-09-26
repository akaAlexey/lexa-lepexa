import { describe, expect, it } from 'vitest'
import { followCues } from './captions.ts'

function videoWithTrack() {
  const track = Object.assign(new EventTarget(), {
    mode: 'showing' as TextTrackMode,
    activeCues: null as unknown,
  })
  const video = document.createElement('video')
  Object.defineProperty(video, 'textTracks', { value: [track] })
  return { video, track }
}

describe('субтитры в режиме камеры', () => {
  it('дорожка скрыта, текущая реплика уходит наружу, пауза между репликами — пустая строка', () => {
    const { video, track } = videoWithTrack()
    const got: string[] = []
    followCues(video, (t) => got.push(t))
    expect(track.mode).toBe('hidden')
    track.activeCues = [{ text: 'Помни нас!' }]
    track.dispatchEvent(new Event('cuechange'))
    track.activeCues = []
    track.dispatchEvent(new Event('cuechange'))
    expect(got).toEqual(['Помни нас!', ''])
  })

  it('отписка возвращает прежний режим и больше не шлёт реплики', () => {
    const { video, track } = videoWithTrack()
    const got: string[] = []
    const off = followCues(video, (t) => got.push(t))
    off()
    expect(track.mode).toBe('showing')
    track.activeCues = [{ text: 'Ура!' }]
    track.dispatchEvent(new Event('cuechange'))
    expect(got).toEqual([])
  })

  it('без дорожки ничего не ломается', () => {
    const video = document.createElement('video')
    Object.defineProperty(video, 'textTracks', { value: [] })
    expect(() => followCues(video, () => undefined)()).not.toThrow()
  })
})
