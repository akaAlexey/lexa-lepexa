import type { NewGroupApplication } from '../../contract/schemas.ts'
import { validateGroupApplication } from '../../domain/groupApplications.ts'
import type { FormSpec } from '../core/form.ts'

/** Поля формы как на экране: число людей — строка из поля ввода. */
export interface GroupFormValues {
  organization: string
  contactName: string
  contact: string
  count: string
  comment: string
}

/** Контекст формы — выезд, на который подаётся заявка. */
export interface GroupFormContext {
  tripId: string
}

/**
 * Заявка группы: пробелы обрезаются, пустое число людей — 0 (ошибка «хотя бы 2»),
 * правила — `validateGroupApplication` из domain. Поле числа людей на экране — `peopleCount`.
 */
export const groupApplicationForm: FormSpec<
  GroupFormValues,
  NewGroupApplication,
  GroupFormContext
> = {
  order: ['organization', 'contactName', 'contact', 'peopleCount'],
  initial: () => ({ organization: '', contactName: '', contact: '', count: '10', comment: '' }),
  toRequest: (v, { tripId }) => ({
    tripId,
    organization: v.organization.trim(),
    contactName: v.contactName.trim(),
    contact: v.contact.trim(),
    peopleCount: v.count.trim() === '' ? 0 : Number(v.count),
    comment: v.comment.trim(),
  }),
  validate: (request) => validateGroupApplication(request),
}
