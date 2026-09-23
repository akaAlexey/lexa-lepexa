import { useNavigate } from 'react-router'
import { useRole } from '../../app/RoleContext.tsx'
import { ROLES, homePath } from '../../app/roles.ts'
import { region } from '../../config/region.ts'
import { Icon } from '../../ui/Icon.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './roles.module.css'

/** Стартовый экран: роль одним нажатием, без регистрации. */
export function RolePickerScreen() {
  const { role, setRole } = useRole()
  const navigate = useNavigate()
  return (
    <Screen
      title={`${region.appTitle}: ${region.appSubtitle}`}
      lead={`Память о Великой Отечественной войне на карте: ${region.regionName}. Кто вы сегодня?`}
      testID="screen-roles"
    >
      <ul className={s.grid}>
        {ROLES.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className={s.role}
              aria-pressed={role?.id === r.id}
              data-testid={`role-${r.id}`}
              onClick={() => {
                setRole(r.id)
                navigate(homePath(r))
              }}
            >
              <Icon name={r.icon} size={2.5} />
              <span className={s.roleLabel}>{r.label}</span>
              <span className={s.roleDescription}>{r.description}</span>
            </button>
          </li>
        ))}
      </ul>
      <section aria-labelledby="sources-title">
        <h2 id="sources-title">Источники</h2>
        <ul>
          {region.sources.map((src) => (
            <li key={src.kind}>
              <a href={src.url} target="_blank" rel="noopener noreferrer">
                {src.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  )
}
