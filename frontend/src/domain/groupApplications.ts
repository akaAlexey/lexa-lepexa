/**
 * Коллективные заявки на выезд: школа, клуб или семейная группа записывается целиком,
 * командир отряда подтверждает или просит уточнить.
 */
import type { GroupApplicationStatus } from '../contract/schemas.ts'
import { pluralRu } from './plural.ts'

export const GROUP_MIN = 2
export const GROUP_MAX = 100

export const GROUP_STATUS_LABEL: Record<GroupApplicationStatus, string> = {
  pending: 'На рассмотрении',
  confirmed: 'Подтверждена',
  clarify: 'Нужно уточнение',
}

export interface GroupDraft {
  organization: string
  contactName: string
  contact: string
  peopleCount: number
}

export type GroupErrors = Partial<Record<keyof GroupDraft, string>>

/** Проверка формы: группа от 2 до 100 человек, названа организация, ответственный и контакт. */
export function validateGroupApplication(draft: GroupDraft): GroupErrors {
  const errors: GroupErrors = {}
  if (!draft.organization.trim()) errors.organization = 'Укажите школу, клуб или группу'
  if (draft.contactName.trim().length < 2) errors.contactName = 'Кто отвечает за группу?'
  if (draft.contact.replace(/\D/g, '').length < 10 && !draft.contact.includes('@'))
    errors.contact = 'Нужен телефон или электронная почта'
  if (!Number.isInteger(draft.peopleCount) || draft.peopleCount < GROUP_MIN)
    errors.peopleCount = `В группе хотя бы ${GROUP_MIN} человека`
  else if (draft.peopleCount > GROUP_MAX)
    errors.peopleCount = `Не больше ${GROUP_MAX} человек — разделите группу на несколько заявок`
  return errors
}

/** «10 человек», «2 человека», «21 человек». */
export const peopleText = (n: number) => pluralRu(n, ['человек', 'человека', 'человек'])
