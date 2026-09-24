import { useCallback, useId, useRef, useState } from 'react'
import { useStoryImages } from '../../functions/storyImages/useStoryImages.ts'
import { Button } from '../../ui/Button.tsx'
import { Dialog } from '../../ui/Dialog.tsx'
import { Notice } from '../../ui/Notice.tsx'
import s from './archive.module.css'

/**
 * Фото к истории (ADR 0011): письма, снимки, документы. Добавляет автор на своём устройстве;
 * по нажатию фото открывается крупно. На сервер фото уйдут, когда бэкенд начнёт принимать файлы.
 */
export function StoryImages({ storyId, canAdd }: { storyId: string; canAdd: boolean }) {
  const { images, busy, error, add, remove, caption, max } = useStoryImages(storyId)
  const [open, setOpen] = useState<number>()
  const close = useCallback(() => setOpen(undefined), [])
  const input = useRef<HTMLInputElement>(null)
  const inputId = useId()
  if (!canAdd && images.length === 0) return null
  const shown = open === undefined ? undefined : images[open]

  return (
    <section aria-labelledby="story-images" className={s.images} data-testid="story-images">
      <h2 id="story-images" className={s.imagesTitle}>
        Фото и документы
      </h2>
      {images.length > 0 && (
        <ul className={s.gallery}>
          {images.map((img, i) => (
            <li key={img.src.slice(-32) + i} className={s.figure}>
              <button
                type="button"
                className={s.thumb}
                onClick={() => setOpen(i)}
                data-testid={`story-image-${i}`}
              >
                <img src={img.src} alt={img.caption || `Фото ${i + 1} к истории`} />
              </button>
              {img.caption && <p className={s.caption}>{img.caption}</p>}
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <>
          <input
            ref={input}
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            className="visually-hidden"
            onChange={(e) => {
              void add(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
            data-testid="story-image-input"
          />
          <Button
            onClick={() => input.current?.click()}
            disabled={busy || images.length >= max}
            icon="image"
            testID="story-image-add"
          >
            {busy ? 'Добавляем…' : `Добавить фото (${images.length} из ${max})`}
          </Button>
          <p className={s.hint}>
            Фото хранятся на этом устройстве, пока история на проверке. Не выкладывайте чужие
            документы без согласия семьи.
          </p>
        </>
      )}
      {error && (
        <Notice tone="error" testID="story-image-error">
          {error}
        </Notice>
      )}
      {shown && open !== undefined && (
        <Dialog
          title={shown.caption || `Фото ${open + 1}`}
          onClose={close}
          testID="story-image-view"
        >
          <img
            className={s.full}
            src={shown.src}
            alt={shown.caption || `Фото ${open + 1} к истории`}
          />
          {canAdd && (
            <>
              <label className={s.captionField}>
                Подпись
                <input
                  type="text"
                  value={shown.caption}
                  onChange={(e) => caption(open, e.target.value)}
                  placeholder="Например: письмо прадеда, июль 1943"
                  data-testid="story-image-caption"
                />
              </label>
              <Button
                onClick={() => {
                  remove(open)
                  close()
                }}
                icon="close"
                testID="story-image-remove"
              >
                Убрать фото
              </Button>
            </>
          )}
        </Dialog>
      )}
    </section>
  )
}
