import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { region } from '../config/region.ts'
import { useAccount } from '../functions/account/useAccount.ts'
import { otherSection, paths } from '../functions/core/paths.ts'
import { Icon } from '../ui/Icon.tsx'
import { Logo } from '../ui/Logo.tsx'
import s from './layout.module.css'
import { TAB_ORDER, TABS, tabOf } from './roles.ts'
import { Toaster } from './Toaster.tsx'

/**
 * Оболочка дизайна «Стол и газета» (ADR 0012): четыре раздела с подписями — внизу на телефоне,
 * узкой тёмной панелью слева на ноутбуке. Страница лежит на газете, по краям виден стол.
 * Карта-хаб занимает всё место без газеты и шапки.
 */
export function Layout() {
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
            {/* Без региона и пометок «Демо» — решение команды 25.09 */}
            <Link to={paths.events()} className={s.mastTitle} data-testid="mast-home">
              {region.appTitle}
            </Link>
            {/* В шапке: «Войти» для гостя, имя пользователя после входа. */}
            <Link to={otherSection('account')} className={s.account} data-testid="nav-role">
              <Icon name="user" size={1.1} />
              <span>{account ? account.name?.trim() || account.login : 'Войти'}</span>
            </Link>
          </header>
        )}
        <main id="main" className={s.main} tabIndex={-1}>
          <Outlet />
        </main>
        {!fullBleed && (
          <footer className={s.footer} data-testid="site-footer">
            <nav aria-label="О проекте" className={s.footerLinks}>
              <Link to={paths.about()}>О нас</Link>
              <Link to={paths.privacy()}>Политика конфиденциальности</Link>
              <Link to={paths.terms()}>Пользовательские условия</Link>
            </nav>
            <p className={s.footerNote}>
              © {new Date().getFullYear()} {region.appTitle}
            </p>
          </footer>
        )}
      </div>
      <Toaster />
      {/* Новый экран открывается сверху, «Назад» возвращает прежнюю прокрутку */}
      <ScrollRestoration />
    </div>
  )
}
