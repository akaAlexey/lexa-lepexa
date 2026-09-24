import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../../api/client.ts'
import { QueryState } from '../../app/QueryState.tsx'
import { useApi } from '../../app/services.tsx'
import type { LivePhoto } from '../../contract/schemas.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { SourceList } from '../../ui/SourceList.tsx'
import { ArView } from './ArView.tsx'
import { assetUrl, ETHICS_NOTE, livePhotoKey } from './livePhotos.ts'
import s from './livePhoto.module.css'

const isNotFound = (e: unknown) => e instanceof ApiError && e.status === 404

type Mode = 'intro' | 'camera' | 'video'

const ANIMATION_NOTE: Record<LivePhoto['animation'], string> = {
  lip_sync: 'Голос синтезирован, лицо оживлено нейросетью, губы совпадают с речью.',
  neural_motion:
    'Голос синтезирован, кадр оживлён нейросетью. Губы с речью не синхронизированы — это общий план.',
  draft:
    'Черновик: голос синтезирован, кадр пока без нейросети. Версия с движением лица и губ — следующим обновлением.',
}

function LivePhotoCard({ photo }: { photo: LivePhoto }) {
  const [agreed, setAgreed] = useState(false)
  const [mode, setMode] = useState<Mode>('intro')
  // Элемент ролика в состоянии: камере он нужен уже смонтированным
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)

  const openCamera = () => {
    if (!video) return
    // Нажатие — жест пользователя: «разблокируем» звук, чтобы ролик заговорил, когда камера найдёт снимок
    void video
      .play()
      .then(() => video.pause())
      .catch(() => undefined)
    setMode('camera')
  }
  const close = useCallback(() => setMode('intro'), [])
  const fallback = useCallback(() => setMode('video'), [])

  return (
    <>
      <figure className={s.figure}>
        <img
          src={assetUrl(photo.photoUrl)}
          alt={photo.caption}
          className={s.photo}
          data-testid="live-photo-image"
        />
        <figcaption className={s.caption}>
          {photo.caption} {photo.demo && <DemoBadge />}
        </figcaption>
      </figure>

      <Card as="section" aria-labelledby="live-speech-title">
        <h2 id="live-speech-title">Что прозвучит</h2>
        <blockquote className={s.speech} data-testid="live-speech">
          {photo.speech}
        </blockquote>
        <p className={s.draft} data-testid="live-animation">
          {ANIMATION_NOTE[photo.animation]}
        </p>
      </Card>

      <Notice testID="live-ethics">
        <strong>Реконструкция с помощью ИИ.</strong> {ETHICS_NOTE} {photo.consent}.
      </Notice>

      <label className={s.consent}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          data-testid="live-consent"
        />
        <span>Понимаю, что это реконструкция нейросетью, а не подлинная запись голоса</span>
      </label>

      <BigButton onClick={openCamera} disabled={!agreed} icon="locate" testID="live-open-camera">
        Навести камеру на снимок
      </BigButton>
      <Button
        onClick={() => setMode('video')}
        disabled={!agreed}
        icon="check"
        testID="live-watch-video"
      >
        Смотреть без камеры
      </Button>

      {/* Один и тот же ролик: на камере — текстурой поверх снимка, без камеры — обычным плеером */}
      <div className={mode === 'video' ? s.player : s.hiddenPlayer} data-testid="live-player">
        <video
          ref={setVideo}
          src={assetUrl(photo.videoUrl)}
          controls={mode === 'video'}
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          className={s.video}
          aria-label={`Ролик-реконструкция: ${photo.title}`}
          data-testid="live-video"
        >
          <track
            kind="captions"
            src={assetUrl(photo.captionsUrl)}
            srcLang="ru"
            label="Русские субтитры"
            default
          />
        </video>
        {mode === 'video' && (
          <span className={s.aiLabelOnVideo} aria-hidden="true">
            Реконструкция с помощью ИИ
          </span>
        )}
      </div>

      <SourceList sources={photo.sources} testID="live-sources" />
      <p>
        <a href={assetUrl(photo.photoUrl)} download data-testid="live-download">
          Скачать снимок с QR-кодом для печати
        </a>
      </p>
      <p>
        <Link to="/live">Все «живые фото»</Link>
      </p>

      {mode === 'camera' && video && (
        <ArView photo={photo} video={video} onClose={close} onFallback={fallback} />
      )}
    </>
  )
}

/** Страница, на которую ведёт QR-код со снимка. */
export function LivePhotoScreen() {
  const api = useApi()
  const { photoId = '' } = useParams()
  const photo = useQuery({
    queryKey: livePhotoKey(photoId),
    queryFn: () => api.getLivePhoto({ id: photoId }),
    retry: (count, e) => !isNotFound(e) && count < 1,
  })
  const notFound = photo.isError && isNotFound(photo.error)
  return (
    <Screen
      title={notFound ? 'Снимок не найден' : `Живое фото: ${photo.data?.title ?? '…'}`}
      testID="screen-live-photo"
    >
      {notFound ? (
        <p data-testid="live-not-found">
          Такого снимка нет. <Link to="/live">Все «живые фото»</Link>
        </p>
      ) : (
        <QueryState query={photo} what="снимок">
          {(data) => <LivePhotoCard photo={data} />}
        </QueryState>
      )}
    </Screen>
  )
}
