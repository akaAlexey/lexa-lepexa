import { NavLink, Outlet, ScrollRestoration } from 'react-router'
import { region } from '../config/region.ts'
import { DemoBadge } from '../ui/DemoBadge.tsx'
import { Icon } from '../ui/Icon.tsx'
import { Logo } from '../ui/Logo.tsx'
import s from './layout.module.css'
import { useRole } from './RoleContext.tsx'
import { DEFAULT_TABS, TABS } from './roles.ts'
import { Toaster } from './Toaster.tsx'

/**
 * Оболочка из макета «Универсальный вариант»: на телефоне — шапка и нижняя панель разделов,
 * на ноутбуке — узкая тёмная панель слева. Последний пункт панели — роль (на макете «Профиль»).
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
            <Logo />
            <span className={s.brandText}>{region.appTitle}</span>
          </NavLink>
          <DemoBadge text="Демо" />
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
            <li className={s.navRole}>
              <NavLink to="/" end className={s.navLink} data-testid="nav-role">
                <Icon name="user" />
                {role ? (
                  <span>
                    <span className="visually-hidden">Роль: </span>
                    {role.short}
                  </span>
                ) : (
                  'Выбрать роль'
                )}
              </NavLink>
            </li>
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
