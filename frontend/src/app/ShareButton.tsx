import { useShare, type ShareResult } from '../functions/share/index.ts'
import { Button } from '../ui/Button.tsx'

const RESULT_TEXT: Record<Exclude<ShareResult, 'shared'>, string> = {
  copied: 'Ссылка скопирована — отправьте её родным или в чат класса',
  unsupported: 'Не получилось поделиться. Скопируйте адрес страницы из строки браузера',
}

/**
 * «Поделиться» из карточки макета: ссылка на этот экран (у каждого экрана свой адрес).
 * Вторичное действие — главная кнопка экрана остаётся одной.
 */
export function ShareButton({
  title,
  text,
  testID,
}: {
  title: string
  text?: string
  testID: string
}) {
  const { result, share } = useShare()
  return (
    <div>
      <Button
        onClick={() => share({ title, text, url: window.location.href })}
        icon="share"
        testID={testID}
      >
        Поделиться
      </Button>
      <p role="status" aria-live="polite" data-testid={`${testID}-result`}>
        {result && result !== 'shared' ? RESULT_TEXT[result] : ''}
      </p>
    </div>
  )
}
