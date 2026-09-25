import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { region } from '../config/region.ts'
import { useAccount } from '../functions/account/useAccount.ts'
import { paths } from '../functions/core/paths.ts'
import { Icon } from '../ui/Icon.tsx'
import { Logo } from '../ui/Logo.tsx'
import s from './layout.module.css'
import { useRole } from './RoleContext.tsx'
import { TAB_ORDER, TABS, tabOf } from './roles.ts'
import { Toaster } from './Toaster.tsx'

/**
 * Оболочка дизайна «Стол и газета» (ADR 0012): четыре раздела с подписями — внизу на телефоне,
 * узкой тёмной панелью слева на ноутбуке. Страница лежит на газете, по краям виден стол.
 * Карта-хаб занимает всё место без газеты и шапки.
 */
export function Layout() {
  const { role } = useRole()
  const { account } = useAccount()
  const { pathname } = useLocation()
  const active = tabOf(pathname)
  const fullBleed = pathname === paths.map()
  return (
    <div className={s.shell} data-full-bleed={fullBleed || undefined}>
      <a href="#main" className={s.skip}>
        Перейти к содержимому
      </a>
      <nav className={s.nav} aria-label="Разделы">
        <Link to={paths.events()} className={s.brand} data-testid="nav-home">
          <Logo size={2} />
          <span className="visually-hidden">{region.appTitle}: мероприятия</span>
        </Link>
        <ul className={s.navList}>
          {TAB_ORDER.map((id) => {
            const tab = TABS[id]
            return (
              <li key={id}>
                <Link
                  to={tab.path}
                  className={s.navLink}
                  aria-current={active === id ? 'page' : undefined}
                  data-testid={`tab-${id}`}
                >
                  <Icon name={tab.icon} size={1.35} />
                  {tab.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className={s.page}>
        {!fullBleed && (
          <header className={s.masthead}>
            {/* Демо-данные помечены у самих записей (DemoBadge), не в шапке — решение команды 25.09 */}
            <Link to={paths.events()} className={s.mastTitle} data-testid="mast-home">
              {region.appTitle}
              <span className={s.mastRegion}> · {region.regionName}</span>
            </Link>
            {/* Кнопка аккаунта: «Вход» до входа, «Профиль» после; роль — рядом, меняется в «Другом» */}
            <Link to={paths.other()} className={s.account} data-testid="nav-role">
              <Icon name="user" size={1.1} />
              <span>{account ? 'Профиль' : 'Вход'}</span>
              {role && (
                <span className={s.accountRole}>
                  {' · '}
                  <span className="visually-hidden">Роль: </span>
                  {role.short}
                </span>
              )}
            </Link>
          </header>
        )}
        <main id="main" className={s.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <Toaster />
      {/* Новый экран открывается сверху, «Назад» возвращает прежнюю прокрутку */}
      <ScrollRestoration />
    </div>
  )
}
