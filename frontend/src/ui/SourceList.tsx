import type { Source } from '../contract/schemas.ts'
import s from './ui.module.css'

/** Источники факта: у каждого факта в интерфейсе есть хотя бы один. */
export function SourceList({ sources, testID }: { sources: readonly Source[]; testID: string }) {
  return (
    <section aria-label="Источники">
      <h2 className="visually-hidden">Источники</h2>
      <ul className={s.sources} data-testid={testID}>
        {sources.map((src) => (
          <li key={src.title}>
            {src.url ? (
              <a href={src.url} target="_blank" rel="noopener noreferrer">
                {src.title}
              </a>
            ) : (
              src.title
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
