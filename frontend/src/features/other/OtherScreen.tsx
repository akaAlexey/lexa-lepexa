import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useRole } from '../../app/RoleContext.tsx'
import type { FieldErrors } from '../../functions/core/form.ts'
import { otherSection, paths, type OtherSection } from '../../functions/core/paths.ts'
import { useAccount } from '../../functions/account/useAccount.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { TextField } from '../../ui/Field.tsx'
import { Icon, type IconName } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { ProfilePanel } from './ProfilePanel.tsx'
import s from './other.module.css'

type SectionId = OtherSection

interface Section {
  id: SectionId
  title: string
  hint: string
  icon: IconName
  /** Закрыт до входа: у раздела нужны личные данные. */
  requiresAccount: boolean
}

function sectionsFor(signedIn: boolean): Section[] {
  return [
    {
      id: 'account',
      title: signedIn ? 'Профиль' : 'Вход и регистрация',
      hint: signedIn ? 'Ваш профиль на этом устройстве' : 'По телефону или почте',
      icon: 'user',
      requiresAccount: false,
    },
    {
      id: 'last-battle',
      title: 'Последний бой',
      hint: 'Места гибели бойцов и поисковая работа',
      icon: 'pin',
      requiresAccount: false,
    },
    {
      id: 'archive',
      title: 'Семейный архив (в разработке)',
      hint: 'Пока доступен рассказ в «Историях»',
      icon: 'archive',
      requiresAccount: true,
    },
    {
      id: 'ar',
      title: 'AR-режим (позже)',
      hint: 'Совмещение снимков пока недоступно',
      icon: 'target',
      requiresAccount: true,
    },
    {
      id: 'photo',
      title: 'Живое фото',
      hint: 'Наведите камеру на снимок — и боец заговорит',
      icon: 'image',
      requiresAccount: true,
    },
    {
      id: 'role',
      title: 'Роль',
      hint: 'Кем вы пользуетесь приложением',
      icon: 'family',
      requiresAccount: false,
    },
  ]
}

/** «Другое»: корневой экран показывает меню, выбранный пункт — самостоятельную страницу. */
export function OtherScreen() {
  const { account } = useAccount()
  const [params] = useSearchParams()
  const requested = params.get('section')
  const sections = sectionsFor(Boolean(account))
  const active = sections.find((x) => x.id === requested)
  if (active?.requiresAccount && !account) {
    return <Navigate to={otherSection('account')} replace />
  }

  if (active) {
    return (
      <Screen
        title={active.title}
        back={
          <BackLink to={paths.other()} testID="other-back">
            Назад
          </BackLink>
        }
        testID={`screen-other-${active.id}`}
      >
        <section className={s.body} aria-label={active.title} data-testid={`other-panel-${active.id}`}>
          <Panel id={active.id} />
        </section>
      </Screen>
    )
  }

  const visible = sections.filter((x) => !x.requiresAccount || account)
  return (
    <Screen title="Другое" lead="Профиль, память семьи и поисковая работа" testID="screen-other">
      <div className={s.hub}>
        <ul className={s.list} aria-label="Разделы страницы Другое">
          {visible.map((x) => (
            <li key={x.id}>
              <Link
                to={x.id === 'last-battle' ? paths.lastBattle() : otherSection(x.id)}
                className={s.item}
                data-testid={`other-${x.id}`}
              >
                <span className={s.itemIcon}>
                  <Icon name={x.icon} size={1.2} />
                </span>
                <span className={s.itemText}>
                  <span className={s.itemTitle}>{x.title}</span>
                  <span className={s.itemHint}>{x.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {!account && (
          <div className={s.body}>
            <Notice>Войдите, чтобы открыть личные функции.</Notice>
            <BigButton to={otherSection('account')} icon="user" testID="other-signin">
              Войти
            </BigButton>
          </div>
        )}
      </div>
    </Screen>
  )
}

function Panel({ id }: { id: SectionId }) {
  switch (id) {
    case 'last-battle':
      return <Navigate to={paths.lastBattle()} replace />
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
      <BigButton to={paths.roles()} icon="family" testID="other-role-switch">
        {role ? 'Сменить роль' : 'Выбрать роль'}
      </BigButton>
    </>
  )
}

function AccountPanel() {
  const { account } = useAccount()
  return account ? (
    <ProfilePanel key={account.id ?? account.login} account={account} />
  ) : (
    <SignInPanel />
  )
}

function SignInPanel() {
  const { signIn, signUp } = useAccount()
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [login, setLogin] = useState('')
  const [name, setName] = useState('')
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

  const registering = mode === 'register'
  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const result = registering
      ? signUp({ login, password, repeat, terms, privacy, name })
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
      <Notice>
        Профиль сохраняется в этом браузере. Серверный вход и синхронизация между устройствами пока
        не подключены.
      </Notice>
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
      {registering && (
        <TextField
          label="Имя и фамилия"
          value={name}
          onChange={setName}
          error={errors.name}
          autoComplete="name"
          testID="register-name"
        />
      )}
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
        <Link to={paths.roles()}>Выбрать роль без входа</Link>
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
