import { useCallback, useState } from 'react'
import { useDeps } from '../core/useDeps.ts'
import { shareLink, type ShareItem, type ShareResult } from './share.ts'

/** «Поделиться» для экрана: действие и его результат (для подсказки «ссылка скопирована»). */
export function useShare(): { result: ShareResult | undefined; share: (item: ShareItem) => void } {
  const deps = useDeps()
  const [result, setResult] = useState<ShareResult>()
  const share = useCallback((item: ShareItem) => void shareLink(deps, item).then(setResult), [deps])
  return { result, share }
}
