import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useRole } from '../../app/RoleContext.tsx'
import type { Account, ProfileValues } from '../../functions/account/account.ts'
import { useAccount } from '../../functions/account/useAccount.ts'
import type { FieldErrors } from '../../functions/core/form.ts'
import { otherSection, paths } from '../../functions/core/paths.ts'
import { Button } from '../../ui/Button.tsx'
import { TextAreaField, TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import s from './other.module.css'

export function ProfilePanel({ account }: { account: Account }) {
  const { saveProfile, signOut } = useAccount()
  const { role } = useRole()
  const [login, setLogin] = useState('')
  const [editing, setEditing] = useState(!account.name)
  const [values, setValues] = useState<ProfileValues>({
    name: account.name ?? '',
    city: account.city ?? '',
    bio: account.bio ?? '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saved, setSaved] = useState(false)
  const set = (key: keyof ProfileValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const result = saveProfile(values, login)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setEditing(false)
    setSaved(true)
  }
  const initials =
    account.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'Я'
  const since = new Date(account.since)
  return (
    <div className={s.form} data-testid="profile">
      <div className={s.profileHeader}>
        <span className={s.avatar} aria-hidden="true">
          {initials}
        </span>
        <div>
          <h3 data-testid="profile-name">{account.name || 'Заполните профиль'}</h3>
          <p className={s.muted} data-testid="profile-login">
            {account.login}
          </p>
        </div>
      </div>
      <p>
        Роль: {role?.label ?? 'не выбрана'}. <Link to={paths.roles()}>Изменить роль</Link>
      </p>
      {!Number.isNaN(since.getTime()) && (
        <p className={s.muted}>На сайте с {since.toLocaleDateString('ru-RU')}</p>
      )}
      {saved && (
        <Notice tone="success" testID="profile-saved">
          Профиль сохранён.
        </Notice>
      )}
      {editing ? (
        <form className={s.form} onSubmit={submit} noValidate>
          {!account.id && (
            <TextField
              label="Телефон или почта для сохранения профиля"
              hint="Укажите логин текущего входа, чтобы профиль сохранился после выхода"
              value={login}
              onChange={setLogin}
              error={errors.login}
              autoComplete="username"
              testID="profile-legacy-login"
            />
          )}
          <TextField
            label="Имя и фамилия"
            hint="Под этим именем вы подписываете комментарии"
            value={values.name}
            onChange={(v) => set('name', v)}
            error={errors.name}
            autoComplete="name"
            maxLength={80}
            testID="profile-name-input"
          />
          <TextField
            label="Город"
            value={values.city}
            onChange={(v) => set('city', v)}
            error={errors.city}
            autoComplete="address-level2"
            maxLength={100}
            testID="profile-city"
          />
          <TextAreaField
            label="О себе"
            hint="До 500 символов. Не указывайте личные данные, которые не хотите показывать."
            value={values.bio}
            onChange={(v) => set('bio', v)}
            error={errors.bio}
            rows={3}
            testID="profile-bio"
          />
          <div className={s.links}>
            <Button type="submit" onClick={() => {}} testID="profile-save">
              Сохранить профиль
            </Button>
            <Button
              onClick={() => {
                setEditing(false)
                setErrors({})
              }}
              testID="profile-cancel"
            >
              Отмена
            </Button>
          </div>
        </form>
      ) : (
        <>
          {account.city && <p data-testid="profile-city-value">Город: {account.city}</p>}
          {account.bio && <p data-testid="profile-bio-value">{account.bio}</p>}
          <Button
            onClick={() => {
              setValues({
                name: account.name ?? '',
                city: account.city ?? '',
                bio: account.bio ?? '',
              })
              setEditing(true)
              setSaved(false)
            }}
            testID="profile-edit"
          >
            Редактировать профиль
          </Button>
        </>
      )}
      <nav className={s.links} aria-label="Личные разделы">
        <Link to={otherSection('archive')}>Семейный архив</Link>
        <Link to={paths.livePhotos()}>Мои живые фото</Link>
      </nav>
      <p className={s.muted}>
        Профиль хранится в этом браузере. Вход на другом устройстве и восстановление пароля появятся
        после подключения серверной авторизации.
      </p>
      <Button onClick={signOut} testID="profile-signout">
        Выйти из аккаунта
      </Button>
    </div>
  )
}
