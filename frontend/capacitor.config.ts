import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Android-приложение из той же веб-сборки (ADR 0001: Android — через Capacitor).
 * Сборка для APK: `npm run build:android` — демо-данные, без service worker (в WebView он не нужен),
 * затем `npx cap sync android` и `./gradlew assembleDebug` в android/ (или CI: .github/workflows/android-apk.yml).
 * Веб-маршрутизация не меняется: WebView открывает тот же index.html на https://localhost.
 */
const config: CapacitorConfig = {
  appId: 'ru.marshrutypobedy.tropa',
  appName: 'Тропа памяти',
  webDir: 'dist',
  android: {
    // Отладочная сборка для показа: можно смотреть консоль через chrome://inspect
    webContentsDebuggingEnabled: true,
  },
}

export default config
