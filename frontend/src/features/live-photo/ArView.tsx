import { useEffect, useRef, useState } from 'react'
import { useServices } from '../../app/services.tsx'
import type { LivePhoto } from '../../contract/schemas.ts'
import { Button } from '../../ui/Button.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { assetUrl } from './livePhotos.ts'
import s from './livePhoto.module.css'

type ArStatus = 'starting' | 'scanning' | 'playing' | 'error'

const HINT: Record<Exclude<ArStatus, 'error'>, string> = {
  starting: 'Включаем камеру…',
  scanning: 'Наведите камеру на снимок целиком — он оживёт',
  playing: 'Снимок ожил. Держите его в кадре',
}

interface Props {
  photo: LivePhoto
  /** Ролик, «разблокированный» нажатием на кнопку, — иначе телефон не даст включить звук позже. */
  video: HTMLVideoElement
  onClose: () => void
  onFallback: () => void
}

/** Полноэкранная камера: снимок узнаётся, поверх него играет ролик-реконструкция. */
export function ArView({ photo, video, onClose, onFallback }: Props) {
  const { platform } = useServices()
  const container = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [status, setStatus] = useState<ArStatus>('starting')
  const [error, setError] = useState('')

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!container.current) return
    let session: { stop(): void } | undefined
    let cancelled = false
    platform.ar
      .trackImage({
        container: container.current,
        targetUrl: assetUrl(photo.targetUrl),
        video,
        aspect: photo.photoAspect,
        onFound: () => {
          setStatus('playing')
          void video.play().catch(() => undefined)
        },
        onLost: () => {
          setStatus('scanning')
          video.pause()
        },
      })
      .then(
        (started) => {
          if (cancelled) started.stop()
          else {
            session = started
            // Снимок мог найтись ещё во время запуска камеры — тогда статус уже «говорит»
            setStatus((current) => (current === 'starting' ? 'scanning' : current))
          }
        },
        (e: unknown) => {
          if (cancelled) return
          setError(e instanceof Error ? e.message : String(e))
          setStatus('error')
        },
      )
    return () => {
      cancelled = true
      session?.stop()
      video.pause()
    }
  }, [platform, photo, video])

  return (
    <div
      className={s.ar}
      role="dialog"
      aria-modal="true"
      aria-label={`Живое фото «${photo.title}» — камера`}
      data-testid="live-ar"
    >
      <div ref={container} className={s.arCamera} />
      <div className={s.arTop}>
        <span className={s.aiLabel} data-testid="live-ai-label">
          Реконструкция с помощью ИИ
        </span>
        <button
          ref={closeRef}
          type="button"
          className={s.arClose}
          onClick={onClose}
          aria-label="Закрыть камеру"
          data-testid="live-ar-close"
        >
          <Icon name="close" size={1.4} />
        </button>
      </div>
      <div className={s.arBottom} role="status" aria-live="polite" data-testid="live-ar-status">
        {status === 'error' ? (
          <>
            <p>
              Не удалось включить камеру: {error}. Разрешите доступ к камере или смотрите ролик.
            </p>
            <Button onClick={onFallback} icon="check" testID="live-ar-fallback">
              Смотреть без камеры
            </Button>
          </>
        ) : (
          <p>{HINT[status]}</p>
        )}
      </div>
    </div>
  )
}
