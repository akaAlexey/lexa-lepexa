import { useEffect, useRef, useState } from 'react'
import { deviceHints, formFactorOf } from '../../functions/ar/formFactor.ts'
import { useDeps } from '../../functions/core/useDeps.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { Notice } from '../../ui/Notice.tsx'
import s from './other.module.css'
import { Soldier3D } from './Soldier3D.tsx'

/**
 * AR-режим: камера телефона и 3D-модель бойца поверх неё. На компьютере камеры для AR нет —
 * объяснение и предпросмотр модели. В MVP модель подготовлена заранее: генерацию 3D-модели бойца
 * нейросетью по фотографии в реальном времени по условиям кейса не поднимали.
 */
export function ArPanel() {
  const { platform } = useDeps()
  const [phone] = useState(
    () => (platform.formFactor?.() ?? formFactorOf(deviceHints())) === 'phone',
  )
  return phone ? <PhoneAr /> : <DesktopAr />
}

function MvpNote() {
  return (
    <Notice testID="ar-mvp-note">
      Как это работает: камера телефона показывает место, а поверх него стоит 3D-реконструкция
      бойца. В полной версии модель собирается нейросетью по фотографии бойца из семейного архива. В
      этом MVP по условиям кейса показана заранее подготовленная модель: генерацию 3D в реальном
      времени не поднимали, чтобы не зависеть от платного облачного сервиса.
    </Notice>
  )
}

function DesktopAr() {
  return (
    <div className={s.cameraPanel} data-testid="ar-desktop">
      <Notice tone="error" testID="ar-unavailable">
        AR-режим работает на телефоне: нужна камера телефона. Откройте этот раздел на телефоне или в
        мобильном приложении «Тропа памяти».
      </Notice>
      <p className={s.muted}>Предпросмотр модели, которую покажет камера телефона:</p>
      <div className={s.arStage}>
        <Soldier3D testID="ar-model-preview" />
      </div>
      <MvpNote />
    </div>
  )
}

function PhoneAr() {
  const { platform } = useDeps()
  const video = useRef<HTMLVideoElement>(null)
  const session = useRef<{ stop(): void } | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(
    () => () => {
      session.current?.stop()
    },
    [],
  )

  const start = async () => {
    if (!video.current) return
    setStatus('starting')
    setError('')
    try {
      session.current?.stop()
      session.current = await platform.ar.openCamera(video.current)
      setStatus('active')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }
  const stop = () => {
    session.current?.stop()
    session.current = undefined
    setStatus('idle')
  }

  return (
    <div className={s.cameraPanel} data-testid="ar-phone">
      <p>
        Наведите камеру на место — рядом появится боец. Проведите пальцем по модели, чтобы повернуть
        её.
      </p>
      <div className={s.arStage} data-camera={status === 'active' || undefined}>
        <video
          ref={video}
          className={s.cameraPreview}
          autoPlay
          muted
          playsInline
          hidden={status !== 'active'}
          data-testid="ar-camera"
        />
        {status === 'active' && (
          <div className={s.arOverlay}>
            <Soldier3D testID="ar-model" />
          </div>
        )}
      </div>
      {status === 'active' ? (
        <Button onClick={stop} testID="ar-camera-stop">
          Выключить камеру
        </Button>
      ) : (
        <BigButton onClick={() => void start()} icon="target" testID="ar-camera-enable">
          {status === 'starting' ? 'Включаем камеру…' : 'Включить камеру'}
        </BigButton>
      )}
      {status === 'error' && (
        <>
          <Notice>
            Не удалось включить камеру: {error}. Проверьте разрешение камеры. Модель можно
            посмотреть и без камеры:
          </Notice>
          <div className={s.arStage}>
            <Soldier3D testID="ar-model-preview" />
          </div>
        </>
      )}
      <MvpNote />
    </div>
  )
}
