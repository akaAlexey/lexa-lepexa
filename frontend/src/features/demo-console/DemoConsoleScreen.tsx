import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useRole } from '../../app/RoleContext.tsx'
import { SUBSCRIPTION_KEY, subscribeNearby, useServices } from '../../app/services.tsx'
import type { LatLon, NewLastBattleSite } from '../../contract/schemas.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './demoConsole.module.css'

/** Вбрасываемая точка — в 5 км к северу: 1° широты ≈ 111,2 км. */
const INJECT_DISTANCE_KM = 5
const KM_PER_LAT_DEGREE = 111.2

function demoSiteNear(p: LatLon): NewLastBattleSite {
  return {
    lat: p.lat + INJECT_DISTANCE_KM / KM_PER_LAT_DEGREE,
    lon: p.lon,
    placeName: 'Лесная опушка у ручья (демо)',
    fightersCount: 1,
    fighters: [{}],
    unit: 'Неизвестно',
    dateText: '1941',
    circumstances: 'Демо-находка для показа уведомлений',
    sources: [{ kind: 'demo', title: 'Демо-данные для показа (вымышлены)' }],
  }
}

/** Готовые точки: ввод чисел на показе медленный и чреват ошибками. */
const PRESETS: readonly { label: string; testID: string; position: LatLon }[] = [
  { label: 'Орёл, центр', testID: 'demo-preset-orel', position: { lat: 52.9651, lon: 36.0785 } },
  { label: 'Мценск', testID: 'demo-preset-mtsensk', position: { lat: 53.2791, lon: 36.5752 } },
]

function parseCoord(value: string, limit: number): number | undefined {
  const n = Number(value.trim().replace(',', '.'))
  return value.trim() !== '' && Number.isFinite(n) && Math.abs(n) <= limit ? n : undefined
}

type Status = { tone: 'success' | 'error'; text: string }

/** Скрытый демо-пульт для показа жюри: не в меню, открывается по адресу /demo. */
export function DemoConsoleScreen() {
  const services = useServices()
  const { api, platform, demo } = services
  const { clearRole } = useRole()
  const queryClient = useQueryClient()
  const [lat, setLat] = useState<string>()
  const [lon, setLon] = useState('')
  const [geoStatus, setGeoStatus] = useState<Status>()
  const [injectStatus, setInjectStatus] = useState<Status>()
  const [resetDone, setResetDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showGeoErrors, setShowGeoErrors] = useState(false)
  const injectStatusRef = useRef<HTMLDivElement>(null)

  // Результат вброса может оказаться под нижним меню — показываем его
  useEffect(() => {
    if (injectStatus) injectStatusRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [injectStatus])

  useEffect(() => {
    let alive = true
    void platform.geo
      .getPosition()
      .then((p) => {
        if (!alive) return
        setLat(String(p.lat))
        setLon(String(p.lon))
      })
      .catch(() => alive && setLat(''))
    return () => {
      alive = false
    }
  }, [platform])

  const latValue = parseCoord(lat ?? '', 90)
  const lonValue = parseCoord(lon, 180)

  const applyPosition = (p: LatLon) => {
    demo.setPosition(p)
    setShowGeoErrors(false)
    setGeoStatus({
      tone: 'success',
      text: `Геопозиция применена: ${p.lat}, ${p.lon}. Сохранится после перезагрузки`,
    })
  }

  const applyGeo = () => {
    if (latValue === undefined || lonValue === undefined) {
      setShowGeoErrors(true)
      setGeoStatus({ tone: 'error', text: 'Проверьте координаты: нужны числа, например 52.97' })
      return
    }
    applyPosition({ lat: latValue, lon: lonValue })
  }

  const applyPreset = (p: LatLon) => {
    setLat(String(p.lat))
    setLon(String(p.lon))
    applyPosition(p)
  }

  const injectSite = async () => {
    setBusy(true)
    setInjectStatus(undefined)
    try {
      if (!platform.storage.get(SUBSCRIPTION_KEY)) await subscribeNearby(services)
      const position = await platform.geo.getPosition()
      await api.createSite({ body: demoSiteNear(position) })
      await queryClient.invalidateQueries({ queryKey: ['sites'] })
      setInjectStatus({
        tone: 'success',
        text: 'Точка вброшена в 5 км к северу — появилось уведомление',
      })
    } catch {
      setInjectStatus({ tone: 'error', text: 'Не удалось вбросить точку. Попробуйте ещё раз' })
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    demo.reset()
    clearRole()
    queryClient.clear()
    setGeoStatus(undefined)
    setInjectStatus(undefined)
    setResetDone(true)
  }

  return (
    <Screen
      title="Демо-пульт"
      lead="Пульт для показа жюри, в меню его нет. Все данные вымышлены."
      testID="screen-demo"
    >
      <Card as="section" aria-labelledby="demo-inject-title">
        <div className={s.section}>
          <h2 id="demo-inject-title">Уведомление о находке</h2>
          <p>Создаёт демо-место гибели бойца в 5 км к северу и присылает уведомление.</p>
          <BigButton
            onClick={() => void injectSite()}
            disabled={busy}
            icon="bell"
            testID="demo-inject-site"
          >
            {busy ? 'Вбрасываем точку…' : 'Вбросить новую точку рядом'}
          </BigButton>
          <div ref={injectStatusRef}>
            {injectStatus && <Notice tone={injectStatus.tone}>{injectStatus.text}</Notice>}
          </div>
        </div>
      </Card>

      <Card as="section" aria-labelledby="demo-geo-title">
        <div className={s.section}>
          <h2 id="demo-geo-title">Геопозиция</h2>
          {lat === undefined ? (
            <p>Определяем текущую позицию…</p>
          ) : (
            <div className={s.section}>
              <div className={s.coords}>
                <TextField
                  label="Широта"
                  hint="Например, 52.97"
                  inputMode="decimal"
                  value={lat}
                  onChange={setLat}
                  error={
                    showGeoErrors && latValue === undefined ? 'Широта от −90 до 90' : undefined
                  }
                  testID="demo-lat"
                />
                <TextField
                  label="Долгота"
                  hint="Например, 36.07"
                  inputMode="decimal"
                  value={lon}
                  onChange={setLon}
                  error={
                    showGeoErrors && lonValue === undefined ? 'Долгота от −180 до 180' : undefined
                  }
                  testID="demo-lon"
                />
              </div>
              <div className={s.actions}>
                <Button onClick={applyGeo} icon="pin" testID="demo-geo-apply">
                  Применить геопозицию
                </Button>
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.testID}
                    onClick={() => applyPreset(preset.position)}
                    testID={preset.testID}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {geoStatus && <Notice tone={geoStatus.tone}>{geoStatus.text}</Notice>}
        </div>
      </Card>

      <Card as="section" aria-labelledby="demo-reset-title">
        <div className={s.section}>
          <h2 id="demo-reset-title">Сброс</h2>
          <p>Забывает роль, прогресс квестов, отметки и подписку, возвращает исходные данные.</p>
          <Button onClick={reset} icon="refresh" testID="demo-reset">
            Сбросить демо-данные
          </Button>
          {resetDone && (
            <Notice tone="success" testID="demo-reset-done">
              Данные сброшены. Роль нужно выбрать заново
            </Notice>
          )}
        </div>
      </Card>

      <p className={s.build} data-testid="demo-build">
        Сборка: {demo.buildId}
      </p>
    </Screen>
  )
}
