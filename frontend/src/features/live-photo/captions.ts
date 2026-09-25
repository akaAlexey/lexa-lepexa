/**
 * Субтитры ролика в режиме камеры: встроенная дорожка переводится в `hidden` (плеер её не рисует —
 * ролик лежит текстурой поверх снимка), а текст текущей реплики отдаётся в `onCue`.
 * Возвращает функцию отписки: дорожка возвращается в прежний режим.
 */
export function followCues(video: HTMLVideoElement, onCue: (text: string) => void): () => void {
  const track = video.textTracks?.[0]
  if (!track) return () => undefined
  const previous = track.mode
  track.mode = 'hidden'
  const emit = () => {
    const active = track.activeCues?.[0] as VTTCue | undefined
    onCue(active?.text ?? '')
  }
  track.addEventListener('cuechange', emit)
  return () => {
    track.removeEventListener('cuechange', emit)
    track.mode = previous
  }
}
