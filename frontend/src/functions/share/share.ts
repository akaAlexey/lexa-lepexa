import type { ShareResult } from '../../platform/types.ts'
import type { Deps } from '../core/deps.ts'

export type { ShareResult } from '../../platform/types.ts'

export interface ShareItem {
  title: string
  text?: string
  /** Адрес экрана: у каждого экрана и карточки он свой. */
  url: string
}

/** Поделиться ссылкой: системное меню на телефоне, копирование на ноутбуке, в Android — плагин. */
export function shareLink({ platform }: Deps, item: ShareItem): Promise<ShareResult> {
  return platform.share.share(item)
}
