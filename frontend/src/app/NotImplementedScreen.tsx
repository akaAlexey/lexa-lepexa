import { Screen } from '../ui/Screen.tsx'

/** Заглушка этапа 3: URL уже есть, экран появится на этапе 4. */
export function NotImplementedScreen({ what }: { what: string }) {
  return (
    <Screen title={what} testID="screen-not-implemented">
      <p>Этот экран появится на следующем этапе.</p>
    </Screen>
  )
}
