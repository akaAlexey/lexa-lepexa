import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { formatDayRu } from '../../domain/format.ts'
import { useDeps } from '../../functions/core/useDeps.ts'
import type { FieldErrors } from '../../functions/core/form.ts'
import { otherSection } from '../../functions/core/paths.ts'
import {
  EMPTY_CONSENT,
  moscowTime,
  signupBody,
  signupRule,
  signupTerms,
  useSignUp,
  useSignups,
  type ConsentValues,
  type SignupTarget,
  type SignupTerms,
} from '../../functions/signup/index.ts'
import { Button } from '../../ui/Button.tsx'
import { Dialog } from '../../ui/Dialog.tsx'
import { TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import ui from '../../ui/ui.module.css'
import s from './events.module.css'

const CONSENT_FIELDS = ['fullName', 'phone', 'agreed'] as const

/**
 * Окно записи на заявку отряда или выезд (решение команды 25.09): сначала условия — дата,
 * начало и конец, место сбора, что взять, возраст, — потом подтверждение. Без подтверждённого
 * возраста 18+ нужно согласие родителя; его данные уходят только в запрос записи.
 */
export function SignupDialog({ target, onClose }: { target: SignupTarget; onClose: () => void }) {
  const { now } = useDeps()
  const terms = signupTerms(target)
  const { age } = useSignups()
  const rule = signupRule(terms, age)
  const signUp = useSignUp(target)
  const [consent, setConsent] = useState<ConsentValues>(EMPTY_CONSENT)
  const [errors, setErrors] = useState<FieldErrors>({})
  const formRef = useRef<HTMLFormElement>(null)

  const set = <K extends keyof ConsentValues>(key: K, value: ConsentValues[K]) => {
    setConsent((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const result = signupBody(rule, age, consent, now())
    if (!result.ok) {
      setErrors(result.errors)
      // фокус — на первое поле с ошибкой, чтобы скринридер прочитал её сразу
      const first = CONSENT_FIELDS.find((f) => result.errors[f])
      formRef.current?.querySelector<HTMLElement>(`[data-testid="signup-${first}"]`)?.focus()
      return
    }
    setErrors({})
    signUp.mutate(result.body)
  }

  return (
    <Dialog title={`Запись: ${terms.title}`} onClose={onClose} testID="signup-dialog">
      <Terms terms={terms} />
      {signUp.isSuccess ? (
        <Notice tone="success" testID="signup-done">
          Вы записаны. {formatDayRu(terms.date)}
          {terms.startsAt && `, сбор в ${moscowTime(terms.startsAt)}`} — {terms.meetingPoint}.
        </Notice>
      ) : (
        <form ref={formRef} className={s.signupForm} onSubmit={submit} noValidate>
          {rule.kind === 'tooYoung' && (
            <Notice tone="error" testID="signup-too-young">
              Участвовать можно с {rule.minAge} лет — так решил отряд из соображений безопасности.
              Посмотрите другие выезды в ленте.
            </Notice>
          )}
          {rule.kind === 'adult' && (
            <Notice testID="signup-adult">
              Возраст 18+ подтверждён в профиле — согласие родителя не нужно.
            </Notice>
          )}
          {rule.kind === 'parentConsent' && (
            <fieldset className={s.consent} data-testid="signup-consent">
              <legend>Согласие родителя</legend>
              <p className={s.consentNote}>
                Возраст 18+ не подтверждён, поэтому нужно согласие родителя или законного
                представителя. Вам уже есть 18?{' '}
                <Link to={otherSection('account')}>Подтвердите возраст в профиле</Link>.
              </p>
              <TextField
                label="ФИО родителя или законного представителя"
                value={consent.fullName}
                onChange={(v) => set('fullName', v)}
                error={errors.fullName}
                autoComplete="off"
                testID="signup-fullName"
              />
              <TextField
                label="Телефон родителя"
                hint="Отряд позвонит, если что-то изменится"
                type="tel"
                inputMode="tel"
                value={consent.phone}
                onChange={(v) => set('phone', v)}
                error={errors.phone}
                autoComplete="off"
                testID="signup-phone"
              />
              <label className={s.agree}>
                <input
                  type="checkbox"
                  checked={consent.agreed}
                  onChange={(e) => set('agreed', e.target.checked)}
                  aria-invalid={Boolean(errors.agreed)}
                  aria-describedby={errors.agreed ? 'signup-agreed-error' : undefined}
                  data-testid="signup-agreed"
                />
                <span>
                  Родитель знает условия выше и согласен на участие. ФИО и телефон увидит только
                  командир отряда
                </span>
              </label>
              {errors.agreed && (
                <p id="signup-agreed-error" className={ui.error}>
                  {errors.agreed}
                </p>
              )}
            </fieldset>
          )}
          {signUp.isError && (
            <Notice tone="error" testID="signup-error">
              Не удалось записаться: {signUp.error.message}. Проверьте данные и попробуйте ещё раз.
            </Notice>
          )}
          {rule.kind !== 'tooYoung' && (
            <Button
              type="submit"
              onClick={() => undefined}
              disabled={signUp.isPending}
              icon="check"
              testID="signup-confirm"
            >
              {signUp.isPending ? 'Записываем…' : 'Подтвердить запись'}
            </Button>
          )}
        </form>
      )}
    </Dialog>
  )
}

/** Условия участия списком «название — значение»: их видно и после записи. */
function Terms({ terms }: { terms: SignupTerms }) {
  const later = 'уточнит отряд'
  return (
    <>
      <dl className={s.terms} data-testid="signup-terms">
        <div>
          <dt>Дата</dt>
          <dd>{formatDayRu(terms.date)}</dd>
        </div>
        <div>
          <dt>Начало</dt>
          <dd data-testid="signup-starts">{moscowTime(terms.startsAt) ?? later}</dd>
        </div>
        <div>
          <dt>Окончание</dt>
          <dd data-testid="signup-ends">{moscowTime(terms.endsAt) ?? later}</dd>
        </div>
        <div>
          <dt>Место сбора</dt>
          <dd>{terms.meetingPoint}</dd>
        </div>
        <div>
          <dt>Возраст</dt>
          <dd>{terms.minAge === undefined ? 'без ограничений' : `от ${terms.minAge} лет`}</dd>
        </div>
        {terms.bring.length > 0 && (
          <div>
            <dt>Что взять</dt>
            <dd>
              <ul className={s.bring}>
                {terms.bring.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
      <p className={s.termsNote}>Время — московское.</p>
    </>
  )
}
