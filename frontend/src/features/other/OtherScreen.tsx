import { useId, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useRole } from '../../app/RoleContext.tsx'
import type { FieldErrors } from '../../functions/core/form.ts'
import { paths } from '../../functions/core/paths.ts'
import { useAccount } from '../../functions/account/useAccount.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { TextField } from '../../ui/Field.tsx'
import { Icon, type IconName } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './other.module.css'

type SectionId = 'account' | 'archive' | 'ar' | 'photo' | 'role'

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
      title: signedIn ? 'Профиль' : 'Вход',
      hint: signedIn ? 'Ваш вход на этом устройстве' : 'Телефон или почта и пароль',
      icon: 'user',
      locked: false,
    },
    {
      id: 'archive',
      title: 'Семейный архив',
      hint: 'Бойцы вашей семьи и их документы',
      icon: 'archive',
      locked: !signedIn,
    },
    {
      id: 'ar',
      title: 'AR-режим',
      hint: 'Места боёв «тогда и сейчас» через камеру',
      icon: 'target',
      locked: !signedIn,
    },
    {
      id: 'photo',
      title: 'Живое фото',
      hint: 'Наведите камеру на снимок — и боец заговорит',
      icon: 'image',
      locked: false,
    },
    {
      id: 'role',
      title: 'Роль и демо',
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
          {/* Стрелка вверх — список свёрнут, вниз — раскрыт */}
          <Icon name="chevron" size={1.4} className={listOpen ? s.arrowDown : s.arrowUp} />
        </button>
        <ul id={listId} className={s.list} hidden={!listOpen}>
          {sections.map((x) => (
            <li key={x.id}>
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
        Раздел откроется после входа: в нём будут личные данные вашей семьи, поэтому он не виден без
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
  const { account, signIn, signOut } = useAccount()
  const { role } = useRole()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [note, setNote] = useState<string>()

  if (account) {
    return (
      <div className={s.profile} data-testid="profile">
        <p>
          Вы вошли как <strong data-testid="profile-login">{account.login}</strong>.
        </p>
        <p className={s.muted}>Роль: {role ? role.label : 'не выбрана'}.</p>
        <Notice>
          Демо: вход живёт только на этом устройстве. Пароль никуда не отправляется и не
          сохраняется.
        </Notice>
        <Button onClick={signOut} testID="profile-signout">
          Выйти
        </Button>
      </div>
    )
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const result = signIn({ login, password })
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setPassword('')
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate data-testid="signin-form">
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
          autoComplete="current-password"
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
      <label className={s.check}>
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        Запомнить меня
      </label>
      <BigButton onClick={() => submit()} icon="user" testID="signin-submit">
        Войти
      </BigButton>
      <p className={s.links}>
        <button
          type="button"
          className={s.linkButton}
          onClick={() => setNote('Восстановление пароля появится вместе с сервером входа.')}
        >
          Забыли пароль?
        </button>
        <button
          type="button"
          className={s.linkButton}
          onClick={() =>
            setNote(
              'Регистрация появится вместе с сервером входа. Сейчас можно войти с любым телефоном или почтой.',
            )
          }
        >
          Зарегистрироваться
        </button>
      </p>
      {note && <Notice testID="signin-note">{note}</Notice>}
      <p className={s.muted}>
        Демо: вход только на этом устройстве, пароль никуда не отправляется.{' '}
        <Link to={paths.home()}>Выбрать роль без входа</Link>
      </p>
    </form>
  )
}
