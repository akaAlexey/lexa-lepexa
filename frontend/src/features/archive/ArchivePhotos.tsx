import { useCallback, useState } from 'react'
import type { StoryPhoto } from '../../contract/schemas.ts'
import { Dialog } from '../../ui/Dialog.tsx'
import { assetUrl } from '../live-photo/livePhotos.ts'
import s from './archive.module.css'

/**
 * Архивные снимки к истории — из открытых источников (Wikimedia Commons, общественное достояние).
 * У каждого подпись, ссылка на источник и лицензия; по нажатию снимок открывается крупно.
 */
export function ArchivePhotos({ photos }: { photos: readonly StoryPhoto[] }) {
  const [open, setOpen] = useState<number>()
  const close = useCallback(() => setOpen(undefined), [])
  const shown = open === undefined ? undefined : photos[open]
  return (
    <section aria-labelledby="archive-photos" className={s.images} data-testid="archive-photos">
      <h2 id="archive-photos" className={s.imagesTitle}>
        Архивные фото
      </h2>
      <ul className={s.gallery}>
        {photos.map((p, i) => (
          <li key={p.src} className={s.figure}>
            <button
              type="button"
              className={s.thumb}
              onClick={() => setOpen(i)}
              data-testid={`archive-photo-${i}`}
            >
              <img src={assetUrl(p.src)} alt={p.caption} loading="lazy" />
            </button>
            <p className={s.caption}>{p.caption}</p>
            <p className={s.caption}>
              <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                Источник
              </a>{' '}
              · {p.license}
            </p>
          </li>
        ))}
      </ul>
      {shown && (
        <Dialog title={shown.caption} onClose={close} testID="archive-photo-view">
          <img className={s.full} src={assetUrl(shown.src)} alt={shown.caption} />
          <p className={s.caption}>
            <a href={shown.sourceUrl} target="_blank" rel="noopener noreferrer">
              Источник снимка
            </a>{' '}
            · {shown.license}
          </p>
        </Dialog>
      )}
    </section>
  )
}
