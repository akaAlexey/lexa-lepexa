import { tokens } from '../theme/tokens.ts'

/** Знак приложения из макета: оливковый круг со звездой. Декоративный — название рядом текстом. */
export function Logo({ size = 2.25 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 34 34"
      width={`${size}rem`}
      height={`${size}rem`}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="17" cy="17" r="16" fill={tokens.color.olive} />
      <polygon
        points="17,7 19.6,13.6 26.5,13.9 21.1,18.3 22.9,25 17,21.2 11.1,25 12.9,18.3 7.5,13.9 14.4,13.6"
        fill={tokens.color.accentLight}
      />
    </svg>
  )
}
