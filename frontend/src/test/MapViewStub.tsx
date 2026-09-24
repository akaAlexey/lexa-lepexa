import type { MapViewProps } from '../map/MapView.tsx'

/** Заглушка карты для jsdom: те же подписи и testID меток, что у настоящей. */
export function MapView({ label, markers = [], onMarkerSelect, testID }: MapViewProps) {
  return (
    <section aria-label={label} data-testid={testID}>
      {markers.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-label={m.label}
          data-testid={`marker-${m.id}`}
          onClick={() => onMarkerSelect?.(m.id)}
        />
      ))}
    </section>
  )
}
