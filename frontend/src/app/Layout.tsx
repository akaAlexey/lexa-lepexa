import { NavLink, Outlet, ScrollRestoration } from 'react-router'
import { region } from '../config/region.ts'
import { DemoBadge } from '../ui/DemoBadge.tsx'
import { Icon } from '../ui/Icon.tsx'
import s from './layout.module.css'
import { useRole } from './RoleContext.tsx'
import { DEFAULT_TABS, TABS } from './roles.ts'
import { Toaster } from './Toaster.tsx'

export function Layout() {
  const { role } = useRole()
  const tabs = role?.tabs ?? DEFAULT_TABS
  return (
    <div className={s.shell}>
      <a href="#main" className={s.skip}>
        Перейти к содержимому
      </a>
      <header className={s.header}>
        <NavLink to="/" end className={s.brand} data-testid="nav-home">
          <Icon name="star" />
          {region.appTitle}
        </NavLink>
        <div className={s.headerMeta}>
          <DemoBadge text="Демо" />
          <NavLink to="/" end className={s.roleLink} data-testid="nav-role">
            {role ? (
              <>
                <span className="visually-hidden">Роль: </span>
                {role.short}
              </>
            ) : (
              'Выбрать роль'
            )}
          </NavLink>
        </div>
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
      <main id="main" className={s.main} tabIndex={-1}>
        <Outlet />
      </main>
      <Toaster />
      {/* Новый экран открывается сверху, «Назад» возвращает прежнюю прокрутку */}
      <ScrollRestoration />
    </div>
  )
}
