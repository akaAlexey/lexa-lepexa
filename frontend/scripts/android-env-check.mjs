// Готова ли машина собрать APK через Capacitor 8. Только читает: ничего не ставит и не меняет.
// Запуск из frontend/: node scripts/android-env-check.mjs   (код выхода 0 — готово, 1 — нет)
// Требования Capacitor 8 (capacitorjs.com/docs/updating/8-0): Node ≥ 22, Android Studio Otter 2025.2.1+,
// SDK API 36 (minSdk 24), AGP 8.13.0 → JDK 17+, Gradle 8.14.3 (ставится обёрткой gradlew).
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const rows = []
const check = (name, ok, found, need) => rows.push({ name, ok, found, need })

/** Вывод команды (stdout + stderr: java -version пишет в stderr) или null, если её нет. */
function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' })
  if (r.error) return null
  return `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() || null
}
/** "1.8.0_401" → 8, "21.0.4" → 21 */
const javaMajor = (text) => {
  const v = /version "([^"]+)"/.exec(text ?? '')?.[1]
  if (!v) return undefined
  const [a, b] = v.split('.').map(Number)
  return a === 1 ? b : a
}

// Node
const node = Number(process.versions.node.split('.')[0])
check('Node.js', node >= 22, process.versions.node, '≥ 22')

// JDK: JAVA_HOME, затем java в PATH
const javaHome = process.env.JAVA_HOME
const javaBin = javaHome ? join(javaHome, 'bin', 'java') : 'java'
const javaText = run(javaBin, ['-version'])
const major = javaMajor(javaText)
const javac = run(javaHome ? join(javaHome, 'bin', 'javac') : 'javac', ['-version'])
check(
  'JDK (javac)',
  major !== undefined && major >= 17 && Boolean(javac),
  javaText
    ? `java ${major ?? '?'}${javac ? `, ${javac}` : ', javac нет (это JRE)'}${javaHome ? '' : ', JAVA_HOME не задан'}`
    : 'нет',
  '17+ (AGP 8.13); Android Studio ставит JBR 21',
)

// Android SDK
const sdkCandidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
  join(homedir(), 'Library', 'Android', 'sdk'),
  join(homedir(), 'Android', 'Sdk'),
].filter(Boolean)
const sdk = sdkCandidates.find((p) => existsSync(p))
check('Android SDK', Boolean(sdk), sdk ?? 'не найден', 'ANDROID_HOME или стандартная папка')

const platforms =
  sdk && existsSync(join(sdk, 'platforms')) ? readdirSync(join(sdk, 'platforms')) : []
const api = platforms.map((p) => Number(/android-(\d+)/.exec(p)?.[1])).filter(Boolean)
check(
  'SDK Platform API 36',
  api.includes(36),
  api.length ? api.sort().join(', ') : 'нет',
  'android-36',
)

const buildTools =
  sdk && existsSync(join(sdk, 'build-tools')) ? readdirSync(join(sdk, 'build-tools')) : []
check('Build-tools', buildTools.length > 0, buildTools.join(', ') || 'нет', 'любые 35+/36')

const adb = sdk
  ? join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
  : null
check(
  'platform-tools (adb)',
  Boolean(adb && existsSync(adb)),
  adb && existsSync(adb) ? adb : 'нет',
  'для установки APK на телефон',
)

// Android Studio (только для сведения: для сборки из консоли хватает SDK + JDK)
const studio = [
  process.env.ProgramFiles && join(process.env.ProgramFiles, 'Android', 'Android Studio'),
  '/Applications/Android Studio.app',
  join(homedir(), 'android-studio'),
].find((p) => p && existsSync(p))
check('Android Studio', Boolean(studio), studio ?? 'не найдена', 'Otter 2025.2.1+ (рекомендовано)')

// Проект
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const deps = { ...pkg.dependencies, ...pkg.devDependencies }
const cap = ['@capacitor/core', '@capacitor/cli', '@capacitor/android'].filter((d) => deps[d])
check(
  'Capacitor в package.json',
  cap.length === 3,
  cap.join(', ') || 'нет',
  '@capacitor/core, cli, android 8.x',
)
check(
  'Папка android/',
  existsSync('android'),
  existsSync('android') ? 'есть' : 'нет',
  'npx cap add android',
)

const ready = rows.filter(
  (r) =>
    r.name !== 'Android Studio' && !r.name.startsWith('Capacitor') && r.name !== 'Папка android/',
)
const envReady = ready.every((r) => r.ok)

const w = Math.max(...rows.map((r) => r.name.length))
console.log(
  `Среда для APK (Capacitor 8), ${new Date().toISOString().slice(0, 10)}, ${process.platform}\n`,
)
for (const r of rows)
  console.log(`${r.ok ? 'OK  ' : 'НЕТ '} ${r.name.padEnd(w)}  ${r.found}   [нужно: ${r.need}]`)
console.log(
  `\n${envReady ? 'Среда готова: можно подключать Capacitor в отдельной ветке.' : 'Среда НЕ готова: APK не собрать. Папку android/ не создаём.'}`,
)
process.exit(envReady ? 0 : 1)
