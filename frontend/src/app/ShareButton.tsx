import { useState } from 'react'
import { useServices } from './services.tsx'
import type { ShareResult } from '../platform/types.ts'
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
  const { platform } = useServices()
  const [result, setResult] = useState<ShareResult>()
  const share = async () => {
    setResult(await platform.share.share({ title, text, url: window.location.href }))
  }
  return (
    <div>
      <Button onClick={() => void share()} icon="share" testID={testID}>
        Поделиться
      </Button>
      <p role="status" aria-live="polite" data-testid={`${testID}-result`}>
        {result && result !== 'shared' ? RESULT_TEXT[result] : ''}
      </p>
    </div>
  )
}
