import { Link } from 'react-router'
import { Screen } from '../ui/Screen.tsx'

export function NotFoundScreen() {
  return (
    <Screen title="Страница не найдена" testID="screen-not-found">
      <p>
        Такой страницы нет. <Link to="/">Вернуться к выбору роли</Link>
      </p>
    </Screen>
  )
}
