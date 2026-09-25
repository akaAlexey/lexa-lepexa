import { useEffect, useRef, useState } from 'react'
import { useServices } from '../../app/services.tsx'
import type { LivePhoto } from '../../contract/schemas.ts'
import { Button } from '../../ui/Button.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { describeCameraError, START_TIMEOUT_MS } from './arErrors.ts'
import { followCues } from './captions.ts'
import { assetUrl } from './livePhotos.ts'
import s from './livePhoto.module.css'

type ArStatus = 'starting' | 'scanning' | 'playing' | 'paused' | 'error'

const HINT: Record<Exclude<ArStatus, 'error'>, string> = {
  starting: 'Включаем камеру…',
  scanning: 'Наведите камеру на снимок целиком — он оживёт',
  playing: 'Снимок ожил. Держите его в кадре',
  paused: 'Камера выключена, пока приложение было свёрнуто',
}

interface Props {
  photo: LivePhoto
  /** Ролик, «разблокированный» нажатием на кнопку, — иначе телефон не даст включить звук позже. */
  video: HTMLVideoElement
  onClose: () => void
  onFallback: () => void
  /** «Включить камеру снова»: родитель пересоздаёт экран камеры — новая сессия с нуля. */
  onRetry: () => void
}

/** Текст текущей реплики субтитров, пока открыта камера. */
function useCurrentCue(video: HTMLVideoElement): string {
  const [cue, setCue] = useState('')
  useEffect(() => followCues(video, setCue), [video])
  return cue
}

/**
 * Полноэкранная камера: снимок узнаётся, поверх него играет заранее подготовленный ролик-реконструкция.
 * Камера гаснет при закрытии, ошибке, таймауте запуска и когда вкладку сворачивают.
 */
export function ArView({ photo, video, onClose, onFallback, onRetry }: Props) {
  const { platform } = useServices()
  const container = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [status, setStatus] = useState<ArStatus>('starting')
  const [error, setError] = useState('')
  const cue = useCurrentCue(video)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!container.current) return
    const controller = new AbortController()
    let session: { stop(): void } | undefined
    let active = true

    const shutdown = () => {
      active = false
      controller.abort()
      session?.stop()
      session = undefined
      video.pause()
    }
    const fail = (e: unknown) => {
      if (!active) return
      shutdown()
      setError(describeCameraError(e))
      setStatus('error')
    }
    // Свернули приложение или ушли со страницы — камеру выключаем, включить снова можно одной кнопкой
    const onHidden = () => {
      if (!active || document.visibilityState !== 'hidden') return
      shutdown()
      setStatus('paused')
    }
    const onPageHide = () => {
      if (!active) return
      shutdown()
      setStatus('paused')
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', onPageHide)

    const timeout = window.setTimeout(
      () => fail(new DOMException('Камера не запустилась', 'TimeoutError')),
      START_TIMEOUT_MS,
    )
    platform.ar
      .trackImage({
        container: container.current,
        targetUrl: assetUrl(photo.targetUrl),
        video,
        aspect: photo.photoAspect,
        signal: controller.signal,
        onFound: () => {
          if (!active) return
          setStatus('playing')
          void video.play().catch(() => undefined)
        },
        onLost: () => {
          if (!active) return
          setStatus('scanning')
          video.pause()
        },
      })
      .then(
        (started) => {
          window.clearTimeout(timeout)
          if (!active) {
            started.stop()
            return
          }
          session = started
          // Снимок мог найтись ещё во время запуска камеры — тогда статус уже «ожил»
          setStatus((current) => (current === 'starting' ? 'scanning' : current))
        },
        (e: unknown) => {
          window.clearTimeout(timeout)
          fail(e)
        },
      )

    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', onPageHide)
      shutdown()
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
      <div className={s.arBottom}>
        {status === 'playing' && cue && (
          <p className={s.arCue} data-testid="live-ar-cue" lang="ru">
            {cue}
          </p>
        )}
        <div role="status" aria-live="polite" data-testid="live-ar-status">
          {status === 'error' ? <p>Не удалось включить камеру: {error}.</p> : <p>{HINT[status]}</p>}
        </div>
        {(status === 'error' || status === 'paused') && (
          <Button onClick={onRetry} icon="refresh" testID="live-ar-retry">
            Включить камеру снова
          </Button>
        )}
        {/* Выход к ролику есть всегда: снимка может не оказаться под рукой */}
        <Button onClick={onFallback} icon="check" testID="live-ar-fallback">
          Смотреть без камеры
        </Button>
      </div>
    </div>
  )
}
