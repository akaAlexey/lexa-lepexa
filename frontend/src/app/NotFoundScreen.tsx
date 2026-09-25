import { Link } from 'react-router'
import { paths } from '../functions/core/paths.ts'
import { BigButton } from '../ui/BigButton.tsx'
import { Screen } from '../ui/Screen.tsx'

/** Неизвестный адрес: главная кнопка — на карту, запасной путь — выбор роли. */
export function NotFoundScreen() {
  return (
    <Screen title="Страница не найдена" testID="screen-not-found">
      <p>
        Такой страницы нет: возможно, ссылка устарела или в ней опечатка. Всё главное — на карте.
      </p>
      <BigButton to={paths.map()} icon="map" testID="not-found-map">
        Открыть карту
      </BigButton>
      <p>
        <Link to={paths.roles()}>Выбрать роль заново</Link>
      </p>
    </Screen>
  )
}
