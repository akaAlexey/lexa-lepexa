import { Link } from 'react-router'
import { otherSection, paths } from '../../functions/core/paths.ts'
import { QueryState } from '../../app/QueryState.tsx'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { assetUrl, livePhotoUrl, useLivePhotos } from './livePhotos.ts'
import s from './livePhoto.module.css'

/** Все «живые фото»: открыть, распечатать снимок с QR-кодом для таблички у памятника. */
export function LivePhotoListScreen() {
  const photos = useLivePhotos()
  return (
    <Screen
      title="Живое фото"
      lead="Наведите камеру телефона на снимок с QR-кодом — боец заговорит. Ролики — реконструкция нейросетью"
      back={
        <BackLink to={otherSection('photo')} testID="back-link">
          К разделу «Другое»
        </BackLink>
      }
      testID="screen-live-list"
    >
      <QueryState query={photos} what="снимки">
        {(list) => (
          <>
            {list[0] && (
              <BigButton to={livePhotoUrl(list[0].id)} icon="locate" testID="live-list-open">
                Оживить снимок «{list[0].title}»
              </BigButton>
            )}
            <Card as="section" aria-labelledby="live-own" testID="live-own">
              <h2 id="live-own" className={s.itemTitle}>
                Фото из вашего семейного архива
              </h2>
              <p>
                Загрузите снимок бойца — нейросеть оживит лицо, и он скажет слова от первого лица.
                Только с согласия родственников.
              </p>
              <Link to={paths.newLivePhoto()} data-testid="live-own-link">
                Оживить своё фото
              </Link>
            </Card>
            <ul className={s.grid} aria-label="Снимки">
              {list.map((p) => (
                <Card as="li" key={p.id} testID={`live-item-${p.id}`}>
                  <img
                    src={assetUrl(p.photoUrl)}
                    alt={p.caption}
                    className={s.thumb}
                    loading="lazy"
                  />
                  <h2 className={s.itemTitle}>
                    <Link to={livePhotoUrl(p.id)}>{p.title}</Link>
                  </h2>
                  <p className={s.caption}>
                    {p.caption} {p.demo && <DemoBadge />}
                  </p>
                  <a href={assetUrl(p.photoUrl)} download>
                    Скачать для печати<span className="visually-hidden">: {p.title}</span>
                  </a>
                </Card>
              ))}
            </ul>
          </>
        )}
      </QueryState>
    </Screen>
  )
}
