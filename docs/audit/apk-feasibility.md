# APK через Capacitor: проверка готовности и решение

25.09.2026, `main` на коммите `56a21ca`; ветка «Живого фото» `fe/live-photo-reliable` (#11) — та же картина.

## Решение

**APK до защиты не делаем.** Среда сборки не готова: нет JDK 17+, Android SDK, Android Studio и Gradle. Capacitor в проект не подключён. Незавершённую папку `android/` и зависимости `@capacitor/*` в репозиторий не добавляем: веб-демо и его маршруты остаются как есть.

Показ на защите — веб-версия в мобильном браузере (Pages). Android — следующая фаза, план ниже.

## Как проверить самим

```bash
cd frontend
node scripts/android-env-check.mjs   # только читает; код выхода 0 — готово, 1 — нет
```

Вывод на машине команды (Windows 11, 25.09.2026):

```text
Среда для APK (Capacitor 8), 2026-09-25, win32

OK   Node.js                   24.19.0   [нужно: ≥ 22]
НЕТ  JDK (javac)               java 8, javac нет (это JRE), JAVA_HOME не задан   [нужно: 17+ (AGP 8.13); Android Studio ставит JBR 21]
НЕТ  Android SDK               не найден   [нужно: ANDROID_HOME или стандартная папка]
НЕТ  SDK Platform API 36       нет   [нужно: android-36]
НЕТ  Build-tools               нет   [нужно: любые 35+/36]
НЕТ  platform-tools (adb)      нет   [нужно: для установки APK на телефон]
НЕТ  Android Studio            не найдена   [нужно: Otter 2025.2.1+ (рекомендовано)]
НЕТ  Capacitor в package.json  нет   [нужно: @capacitor/core, cli, android 8.x]
НЕТ  Папка android/            нет   [нужно: npx cap add android]

Среда НЕ готова: APK не собрать. Папку android/ не создаём.
```

Что ещё проверено вручную:

| Проверка                                                       | Результат                                                                                                               |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Установленные программы (реестр Windows)                       | Только «Java 8 Update 401» (JRE в `C:\Program Files\Java\jre-1.8`) и Java Auto Updater. Android Studio, JDK, Gradle нет |
| `adb`, `sdkmanager`, `avdmanager`, `gradle`, `emulator` в PATH | Нет ни одного                                                                                                           |
| `~/.gradle`, `~/.android`                                      | Нет (Gradle и Android на машине не запускались)                                                                         |
| `@capacitor/cli` в реестре npm                                 | 8.5.2, `engines.node >= 22` — Node 24 подходит                                                                          |
| Свободное место на C:                                          | ≈ 107 ГБ — хватит на Android Studio, SDK и образ эмулятора                                                              |

## Что требует Capacitor 8

По [capacitorjs.com/docs/getting-started/environment-setup](https://capacitorjs.com/docs/getting-started/environment-setup) и [capacitorjs.com/docs/updating/8-0](https://capacitorjs.com/docs/updating/8-0):

|                                | Требование                                                 | Есть         |
| ------------------------------ | ---------------------------------------------------------- | ------------ |
| Node.js                        | 22+                                                        | 24.19.0      |
| Android Studio                 | Otter 2025.2.1 или новее (ставит JDK сама)                 | нет          |
| JDK                            | 17+ для Android Gradle Plugin 8.13                         | только JRE 8 |
| Android SDK                    | Platform API 36 (`compileSdk`/`targetSdk` 36), `minSdk` 24 | нет          |
| Android Gradle Plugin / Gradle | 8.13.0 / 8.14.3 (обёртка `gradlew` скачает сама)           | —            |
| Kotlin                         | 2.2.20 (в шаблоне Capacitor)                               | —            |

## Почему не сейчас

- Поставить среду — это Android Studio, SDK, согласие с лицензиями SDK, переменные окружения, несколько гигабайт загрузки и первая сборка Gradle с загрузкой зависимостей. Это работа не на один вечер и не для машины, на которой идёт показ.
- Полусобранная `android/` в репозитории — риск для веб-демо без пользы: новые зависимости в `package.json`, возможные правки сборки, а APK всё равно не проверить без SDK и телефона.
- Для показа APK не нужен: веб-версия открывается по ссылке с телефона, камера AR работает в мобильном браузере по HTTPS (см. `frontend/docs/LIVE_PHOTO_MOBILE_CHECKLIST.md`).

## План после защиты

Отдельная ветка (например, `mobile/capacitor-android`), веб-маршрутизацию и сборку Pages не трогаем.

1. Поставить Android Studio Otter 2025.2.1+, в SDK Manager — Android 16 (API 36), Build-tools, Platform-tools. Задать `ANDROID_HOME`, `JAVA_HOME` на JBR из Android Studio. `node scripts/android-env-check.mjs` — все строки среды «OK».
2. В ветке: `npm i @capacitor/core @capacitor/android` и `npm i -D @capacitor/cli` одной версии 8.x; `npx cap init "Тропа памяти" ru.marshrutypobedy.app --web-dir dist`; `npx cap add android`.
3. `VITE_API_MODE=mock npm run build && npx cap sync android && cd android && ./gradlew assembleDebug`. Отладочный APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
4. В `android/app/src/main/AndroidManifest.xml` — `<uses-permission android:name="android.permission.CAMERA" />`. Capacitor передаёт WebView запрос камеры (`getUserMedia`) через системное разрешение — проверить на телефоне.

**Что проверяем в APK — только три вещи:**

|                   | Действие                                                           | Ожидаемо                                                                                                                                |
| ----------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Запуск            | Установить `app-debug.apk`, открыть                                | Выбор роли, разделы открываются, карта рисуется; прямой переход на `/live/soldier` через «Истории» → «Живое фото»                       |
| Разрешение камеры | «Живое фото» → согласие → «Навести камеру»                         | Системный запрос камеры; после «Разрешить» — «Наведите камеру на снимок», снимок узнаётся                                               |
| Fallback          | Запретить камеру; отдельно — включить авиарежим до открытия камеры | «Доступ к камере запрещён…» / «Не удалось включить камеру…» за ≤ 20 с, «Смотреть без камеры» открывает ролик с субтитрами и пометкой ИИ |

Известные особенности, которые надо учесть в той ветке:

- Приложение в WebView работает на `https://localhost` — защищённый контекст, камера доступна. Если включать живой бэкенд, этот origin нужно добавить в `CORS_ORIGINS`.
- three.js и MindAR грузятся с jsDelivr: AR в APK без сети не запустится (сработает fallback). Для офлайна — сначала положить библиотеки в сборку (LP-9 в `live-photo-scope.md`).
- Нативного AR нет и в этот объём не входит: в APK работает тот же веб-AR внутри WebView.

## Откат

Решение ничего не меняет в веб-версии: в этой ветке добавлены только `docs/audit/apk-feasibility.md` и скрипт `frontend/scripts/android-env-check.mjs` (только чтение). Удалить оба файла — и всё как было.
