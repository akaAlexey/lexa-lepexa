import { NavLink, Outlet, ScrollRestoration } from 'react-router'
import { region } from '../config/region.ts'
import { Icon } from '../ui/Icon.tsx'
import { Logo } from '../ui/Logo.tsx'
import s from './layout.module.css'
import { useRole } from './RoleContext.tsx'
import { DEFAULT_TABS, TABS } from './roles.ts'
import { Toaster } from './Toaster.tsx'

/**
 * Оболочка из макета «Универсальный вариант»: на телефоне — шапка и нижняя панель разделов,
 * на ноутбуке — узкая тёмная панель слева. Роль — в шапке, как кнопка аккаунта на макете.
 */
export function Layout() {
  const { role } = useRole()
  const tabs = role?.tabs ?? DEFAULT_TABS
  return (
    <div className={s.shell}>
      <a href="#main" className={s.skip}>
        Перейти к содержимому
      </a>
      <div className={s.rail}>
        <header className={s.header}>
          <NavLink to="/" end className={s.brand} data-testid="nav-home">
            <Logo size={2} />
            <span className={s.brandText}>
              {region.appTitle}
              {/* Подпись как на макетах; «демо» — этика: придуманное не выдаём за реальное */}
              <span className={s.brandSub}>
                Демо<span className={s.brandRegion}> · Орловская обл.</span>
              </span>
            </span>
          </NavLink>
          {/* Роль — как кнопка аккаунта на макете: без регистрации, меняется в одно нажатие */}
          <NavLink to="/" end className={s.roleLink} data-testid="nav-role">
            <Icon name="user" size={1.2} />
            {role ? (
              <span>
                <span className="visually-hidden">Роль: </span>
                {role.short}
              </span>
            ) : (
              'Выбрать роль'
            )}
          </NavLink>
        </header>
        <nav className={s.nav} aria-label="Разделы">
          <ul className={s.navList}>
            {tabs.map((id) => {
              const tab = TABS[id]
              return (
                <li key={id}>
                  <NavLink to={tab.path} className={s.navLink} data-testid={`tab-${id}`}>
                    <Icon name={tab.icon} />
                    {tab.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
      <main id="main" className={s.main} tabIndex={-1}>
        <Outlet />
      </main>
      <Toaster />
      {/* Новый экран открывается сверху, «Назад» возвращает прежнюю прокрутку */}
      <ScrollRestoration />
    </div>
  )
}
