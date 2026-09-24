import { useId, useState } from 'react'
import { Link } from 'react-router'
import { ShareButton } from '../../app/ShareButton.tsx'
import { memory, type MyLivePhoto } from '../../functions/core/deviceMemory.ts'
import { paths } from '../../functions/core/paths.ts'
import { useDeviceMemory } from '../../functions/core/useDeviceMemory.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { TextAreaField, TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { assetUrl, CASE_PHRASE, ETHICS_NOTE, useLivePhotos } from './livePhotos.ts'
import s from './livePhoto.module.css'

type TextChoice = 'case' | 'feat'

/** Снимок уменьшаем до 480 px: в памяти устройства хранится превью, а не оригинал. */
async function readPhoto(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
  try {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const scale = Math.min(1, 480 / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } catch {
    // Браузер не смог уменьшить — берём как есть
    return dataUrl
  }
}

interface Errors {
  photo?: string
  feat?: string
  consent?: string
}

/**
 * «Оживить своё фото» (задача 7 кейса): снимок из семейного архива, текст от первого лица,
 * согласие родственников. Генерация ролика — серверная задача (docs/LIVE_PHOTO.md);
 * в демо после отправки показываем пример готового ролика с честной пометкой.
 */
export function NewLivePhotoScreen() {
  const fileId = useId()
  const [mine, setMine] = useDeviceMemory(memory.myLivePhotos)
  const [photo, setPhoto] = useState<string>()
  const [name, setName] = useState('')
  const [choice, setChoice] = useState<TextChoice>('case')
  const [feat, setFeat] = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [sent, setSent] = useState<MyLivePhoto>()
  // Пример результата — первый готовый ролик из «живых фото»
  const example = useLivePhotos().data?.[0]

  const speech = choice === 'case' ? CASE_PHRASE : feat.trim()

  const submit = () => {
    const next: Errors = {}
    if (!photo) next.photo = 'Выберите фотографию бойца'
    if (choice === 'feat' && feat.trim().length < 20)
      next.feat = 'Расскажите о подвиге хотя бы в одном предложении (от 20 символов)'
    if (!consent) next.consent = 'Без согласия родственников оживлять фото нельзя'
    setErrors(next)
    if (Object.keys(next).length > 0 || !photo) return
    const item: MyLivePhoto = {
      id: `LP-${Date.now().toString(36)}`,
      name: name.trim() || 'Неизвестный боец',
      speech,
      photo,
      createdAt: new Date().toISOString(),
    }
    setMine((prev) => [item, ...prev].slice(0, 10))
    setSent(item)
  }

  if (sent) {
    return (
      <Screen title="Фото принято" testID="screen-live-new">
        <Notice tone="success" testID="live-new-sent">
          Снимок сохранён в «Моих живых фото» на этом устройстве. Ролик по нему соберёт сервер
          генерации — это следующий этап проекта. Ниже — пример того, как будет выглядеть результат.
        </Notice>
        <figure className={s.figure}>
          <img src={sent.photo} alt={`Фото: ${sent.name}`} className={s.photo} />
          <figcaption className={s.caption}>{sent.name}</figcaption>
        </figure>
        <Card as="section" aria-labelledby="live-new-speech">
          <h2 id="live-new-speech">Что прозвучит</h2>
          <blockquote className={s.speech} data-testid="live-new-speech">
            {sent.speech}
          </blockquote>
        </Card>
        {example && (
          <div className={s.player}>
            <p className={s.aiLabel}>Пример ролика на другом снимке · Реконструкция с помощью ИИ</p>
            <video
              src={assetUrl(example.videoUrl)}
              controls
              playsInline
              preload="metadata"
              className={s.video}
              aria-label="Пример ролика-реконструкции"
              data-testid="live-new-example"
            >
              <track
                kind="captions"
                srcLang="ru"
                label="Русский"
                src={assetUrl(example.captionsUrl)}
                default
              />
            </video>
          </div>
        )}
        <BigButton to={paths.newStory()} icon="story" testID="live-new-story">
          Рассказать историю бойца в народный архив
        </BigButton>
        <ShareButton
          title={`Живое фото: ${sent.name}`}
          text={`«${sent.speech}» — помним. Тропа памяти`}
          testID="live-new-share"
        />
        <p>
          <Link to={paths.livePhotos()}>Все «живые фото»</Link>
        </p>
      </Screen>
    )
  }

  return (
    <Screen
      title="Оживить своё фото"
      lead="Фото бойца из семейного архива, музея или «Памяти народа» — нейросеть оживит лицо и озвучит слова от первого лица"
      testID="screen-live-new"
    >
      <Notice testID="live-new-ethics">
        <strong>Реконструкция с помощью ИИ.</strong> {ETHICS_NOTE}
      </Notice>

      <div className={s.upload}>
        <label htmlFor={fileId} className={s.uploadLabel}>
          Фотография бойца
        </label>
        <input
          id={fileId}
          type="file"
          accept="image/*"
          aria-invalid={Boolean(errors.photo)}
          data-testid="live-new-file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void readPhoto(file).then(setPhoto)
          }}
        />
        {errors.photo && (
          <span className={s.uploadError} role="alert" data-testid="live-new-photo-error">
            {errors.photo}
          </span>
        )}
        {photo && (
          <img
            src={photo}
            alt="Выбранная фотография"
            className={s.thumb}
            data-testid="live-new-preview"
          />
        )}
      </div>

      <TextField
        label="Кто на фото"
        hint="ФИО и звание, если известны. Можно оставить пустым"
        value={name}
        onChange={setName}
        testID="live-new-name"
      />

      <fieldset className={s.choice}>
        <legend>Что скажет боец</legend>
        <label>
          <input
            type="radio"
            name="live-text"
            checked={choice === 'case'}
            onChange={() => setChoice('case')}
            data-testid="live-new-text-case"
          />
          <span>«{CASE_PHRASE}»</span>
        </label>
        <label>
          <input
            type="radio"
            name="live-text"
            checked={choice === 'feat'}
            onChange={() => setChoice('feat')}
            data-testid="live-new-text-feat"
          />
          <span>Краткий рассказ о подвиге — от первого лица</span>
        </label>
      </fieldset>
      {choice === 'feat' && (
        <TextAreaField
          label="Рассказ о подвиге"
          hint="Только проверенные факты: из наградного листа, Книги Памяти, писем. Смысл не меняем"
          value={feat}
          onChange={setFeat}
          error={errors.feat}
          rows={4}
          testID="live-new-feat"
        />
      )}

      <label className={s.consent}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          aria-invalid={Boolean(errors.consent)}
          data-testid="live-new-consent"
        />
        <span>
          Я родственник бойца или у меня есть согласие родственников. Фото — только для мемориальных
          целей
        </span>
      </label>
      {errors.consent && (
        <Notice tone="error" testID="live-new-consent-error">
          {errors.consent}
        </Notice>
      )}

      <BigButton onClick={submit} icon="check" testID="live-new-submit">
        Оживить фото
      </BigButton>

      {mine.length > 0 && (
        <section aria-labelledby="live-mine">
          <h2 id="live-mine">Мои живые фото</h2>
          <ul className={s.grid} data-testid="live-mine">
            {mine.map((m) => (
              <Card as="li" key={m.id}>
                <img src={m.photo} alt={`Фото: ${m.name}`} className={s.thumb} />
                <p className={s.itemTitle}>{m.name}</p>
                <p className={s.caption}>Ожидает генерации</p>
              </Card>
            ))}
          </ul>
        </section>
      )}
    </Screen>
  )
}
