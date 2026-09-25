import { useId, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useRole } from '../../app/RoleContext.tsx'
import type { FieldErrors } from '../../functions/core/form.ts'
import { paths, type OtherSection } from '../../functions/core/paths.ts'
import { useAccount } from '../../functions/account/useAccount.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { TextField } from '../../ui/Field.tsx'
import { Icon, type IconName } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './other.module.css'

type SectionId = OtherSection

interface Section {
  id: SectionId
  title: string
  hint: string
  icon: IconName
  /** Закрыт до входа: у раздела нужны личные данные. */
  locked: boolean
}

function sectionsFor(signedIn: boolean): Section[] {
  return [
    {
      id: 'account',
      title: signedIn ? 'Профиль' : 'Вход и регистрация',
      hint: signedIn ? 'Ваш профиль на этом устройстве' : 'По телефону или почте',
      icon: 'user',
      locked: false,
    },
    {
      id: 'archive',
      title: 'Семейный архив (в разработке)',
      hint: 'Пока доступен рассказ в «Историях»',
      icon: 'archive',
      locked: false,
    },
    {
      id: 'ar',
      title: 'AR-режим (позже)',
      hint: 'Совмещение снимков пока недоступно',
      icon: 'target',
      locked: false,
    },
    {
      id: 'photo',
      title: 'Живое фото',
      hint: 'Наведите камеру на снимок — и боец заговорит',
      icon: 'image',
      locked: !signedIn,
    },
    {
      id: 'role',
      title: 'Роль',
      hint: 'Кем вы пользуетесь приложением',
      icon: 'family',
      locked: false,
    },
  ]
}

const isSection = (v: string | null): v is SectionId =>
  v === 'account' || v === 'archive' || v === 'ar' || v === 'photo' || v === 'role'

/**
 * «Другое» (ADR 0012): одна большая панель со списком разделов. В шапке — имя открытого раздела
 * и стрелка: вверх — список свёрнут, вниз — раскрыт. У каждого раздела свой адрес (?section=).
 */
export function OtherScreen() {
  const { account } = useAccount()
  const [params, setParams] = useSearchParams()
  const requested = params.get('section')
  const activeId: SectionId | undefined = isSection(requested) ? requested : undefined
  const sections = sectionsFor(Boolean(account))
  const active = sections.find((x) => x.id === activeId)
  const [listOpen, setListOpen] = useState(!active)
  const listId = useId()
  // «Вход» в шапке ведёт сюда с ?section=account — раздел открывается сразу, даже если экран уже открыт
  const [seenId, setSeenId] = useState(activeId)
  if (seenId !== activeId) {
    setSeenId(activeId)
    if (activeId) setListOpen(false)
  }

  const open = (id: SectionId) => {
    setParams({ section: id }, { replace: false })
    setListOpen(false)
  }

  return (
    <Screen title="Другое" lead="Профиль, семейный архив и будущие режимы" testID="screen-other">
      <div className={s.hub}>
        <button
          type="button"
          className={s.hubHead}
          aria-expanded={listOpen}
          aria-controls={listId}
          onClick={() => setListOpen((v) => !v)}
          data-testid="other-toggle"
        >
          <span className={s.hubTitle}>
            <span className={s.hubName}>{active ? active.title : 'Разделы'}</span>
            <span className={s.hubHint}>
              {listOpen ? 'Выберите раздел' : 'Нажмите, чтобы выбрать другой раздел'}
            </span>
          </span>
          {/* Стрелка вниз — список можно раскрыть, вверх — раскрыт */}
          <span className={s.arrow} data-open={listOpen || undefined}>
            <Icon name="chevron" size={1.4} />
          </span>
        </button>
        {/* Плавное раскрытие: высота списка анимируется через grid-template-rows 0fr → 1fr */}
        <div className={s.listWrap} data-open={listOpen || undefined}>
          <ul id={listId} className={s.list} inert={!listOpen} aria-hidden={!listOpen || undefined}>
            {sections.map((x, i) => (
              <li key={x.id} style={{ '--i': i } as CSSProperties}>
                <button
                  type="button"
                  className={s.item}
                  aria-current={x.id === activeId ? 'true' : undefined}
                  onClick={() => open(x.id)}
                  data-testid={`other-${x.id}`}
                >
                  <span className={s.itemIcon}>
                    <Icon name={x.icon} size={1.2} />
                  </span>
                  <span className={s.itemText}>
                    <span className={s.itemTitle}>{x.title}</span>
                    <span className={s.itemHint}>{x.hint}</span>
                  </span>
                  {x.locked && (
                    <span className={s.lock}>
                      <Icon name="lock" size={1} />
                      после входа
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {active && !listOpen && (
          <div className={s.body} data-testid={`other-panel-${active.id}`}>
            {active.locked ? <Locked onSignIn={() => open('account')} /> : <Panel id={active.id} />}
          </div>
        )}
      </div>
    </Screen>
  )
}

function Locked({ onSignIn }: { onSignIn: () => void }) {
  return (
    <>
      <Notice>
        Раздел откроется после входа: в нём ваши личные фото и данные, поэтому он не виден без
        профиля.
      </Notice>
      <BigButton onClick={onSignIn} icon="user" testID="other-locked-signin">
        Войти
      </BigButton>
    </>
  )
}

function Panel({ id }: { id: SectionId }) {
  switch (id) {
    case 'account':
      return <AccountPanel />
    case 'archive':
      return (
        <>
          <p>
            Здесь будут бойцы вашей семьи: имена, документы и найденные записи в «Памяти народа» и
            ОБД «Мемориал». Пока расскажите о прадеде в «Историях» — краевед проверит рассказ.
          </p>
          <BigButton to={paths.newStory()} icon="story" testID="other-family-story">
            Рассказать историю
          </BigButton>
        </>
      )
    case 'ar':
      return (
        <Notice>
          AR-режим «тогда и сейчас» появится в приложении для Android: камера совместит место боя с
          архивным снимком.
        </Notice>
      )
    case 'photo':
      return (
        <>
          <Notice>
            Только с согласия родственников и с плашкой «создано ИИ»: это не голос бойца, а
            реконструкция — так сказано рядом с каждым роликом.
          </Notice>
          <BigButton to={paths.livePhotos()} icon="image" testID="other-live">
            Открыть «Живое фото»
          </BigButton>
        </>
      )
    case 'role':
      return <RolePanel />
  }
}

function RolePanel() {
  const { role } = useRole()
  return (
    <>
      <p>
        {role ? (
          <>
            Сейчас вы — <strong>{role.label}</strong>. Роль меняет главную кнопку на экранах.
          </>
        ) : (
          'Роль не выбрана: выберите, чтобы на экранах была ваша главная кнопка.'
        )}
      </p>
      <BigButton to={paths.home()} icon="family" testID="other-role-switch">
        {role ? 'Сменить роль' : 'Выбрать роль'}
      </BigButton>
    </>
  )
}

function AccountPanel() {
  const { account, signIn, signUp, signOut } = useAccount()
  const { role } = useRole()
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [params] = useSearchParams()
  const navigate = useNavigate()
  // Пришли с закрытого экрана (?next=/live) — после входа возвращаем туда
  const returnTo = params.get('next')

  if (account) {
    return (
      <div className={s.profile} data-testid="profile">
        <p>
          Вы вошли как <strong data-testid="profile-login">{account.login}</strong>.
        </p>
        <p className={s.muted}>Роль: {role ? role.label : 'не выбрана'}.</p>
        <Button onClick={signOut} testID="profile-signout">
          Выйти
        </Button>
      </div>
    )
  }

  const registering = mode === 'register'
  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const result = registering
      ? signUp({ login, password, repeat, terms, privacy })
      : signIn({ login, password })
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setPassword('')
    setRepeat('')
    if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) {
      void navigate(returnTo, { replace: true })
    }
  }
  const switchTo = (next: 'signin' | 'register') => {
    setMode(next)
    setErrors({})
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate data-testid="signin-form">
      <div className={s.tabs} role="tablist" aria-label="Вход или регистрация">
        <button
          type="button"
          role="tab"
          aria-selected={!registering}
          className={s.tab}
          onClick={() => switchTo('signin')}
          data-testid="signin-tab"
        >
          Вход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={registering}
          className={s.tab}
          onClick={() => switchTo('register')}
          data-testid="register-tab"
        >
          Регистрация
        </button>
      </div>
      <TextField
        label="Телефон или почта"
        value={login}
        onChange={setLogin}
        error={errors.login}
        autoComplete="username"
        inputMode="email"
        testID="signin-login"
      />
      <div className={s.password}>
        <TextField
          label="Пароль"
          type={show ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete={registering ? 'new-password' : 'current-password'}
          testID="signin-password"
        />
        <button
          type="button"
          className={s.showPassword}
          aria-pressed={show}
          onClick={() => setShow((v) => !v)}
          data-testid="signin-show"
        >
          <Icon name="eye" size={1.1} />
          {show ? 'Скрыть' : 'Показать'}
        </button>
      </div>
      {registering && (
        <>
          <TextField
            label="Повторите пароль"
            type={show ? 'text' : 'password'}
            value={repeat}
            onChange={setRepeat}
            error={errors.repeat}
            autoComplete="new-password"
            testID="register-repeat"
          />
          <Consent checked={terms} onChange={setTerms} error={errors.terms} testID="register-terms">
            Принимаю <Link to={paths.terms()}>пользовательские условия</Link>
          </Consent>
          <Consent
            checked={privacy}
            onChange={setPrivacy}
            error={errors.privacy}
            testID="register-privacy"
          >
            Согласен с <Link to={paths.privacy()}>политикой конфиденциальности</Link> и обработкой
            персональных данных
          </Consent>
        </>
      )}
      <BigButton
        onClick={() => submit()}
        icon="user"
        testID={registering ? 'register-submit' : 'signin-submit'}
      >
        {registering ? 'Зарегистрироваться' : 'Войти'}
      </BigButton>
      <p className={s.muted}>
        {registering ? (
          <>
            Уже есть профиль?{' '}
            <button type="button" className={s.linkButton} onClick={() => switchTo('signin')}>
              Войти
            </button>
          </>
        ) : (
          <>
            Нет профиля?{' '}
            <button type="button" className={s.linkButton} onClick={() => switchTo('register')}>
              Зарегистрироваться
            </button>
          </>
        )}
        {' · '}
        <Link to={paths.home()}>Выбрать роль без входа</Link>
      </p>
    </form>
  )
}

function Consent({
  checked,
  onChange,
  error,
  testID,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  error?: string
  testID: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className={s.consent}>
      <label className={s.check}>
        <input
          type="checkbox"
          required
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? id : undefined}
          data-testid={testID}
        />
        <span>
          {children} <span aria-hidden="true">*</span>
        </span>
      </label>
      {error && (
        <span id={id} className={s.error}>
          {error}
        </span>
      )}
    </div>
  )
}
