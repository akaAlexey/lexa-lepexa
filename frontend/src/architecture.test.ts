// @vitest-environment node
/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, normalize, relative, sep } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Тест архитектуры (ADR 0008): функции отдельно от страниц.
 * Импорты разбирает компилятор TypeScript — учитываются import(), export … from и ?worker&url.
 */

const SRC = normalize(join(process.cwd(), 'src'))
/** Пути в правилах и исключениях — через «/», на Windows node:path отдаёт «\». */
const toPosix = (p: string) => p.split(sep).join('/')

/**
 * Ещё не переведённые файлы: файл → правила, которые он пока нарушает.
 * Тест падает и на новое нарушение, и на исключение, которое уже не нужно. К концу шага A список пуст.
 */
const EXCEPTIONS: Record<string, readonly Rule[]> = {
  'features/archive/ArchiveScreen.tsx': ['paths'],
  'features/archive/NewStoryScreen.tsx': ['page-services'],
  'features/archive/StoryScreen.tsx': ['page-services', 'paths'],
  'features/archive/routes.tsx': ['paths'],
  'features/archive/stories.ts': ['page-services', 'paths'],
  'features/chronicle/ChronicleScreen.tsx': ['page-services', 'paths'],
  'features/chronicle/routes.tsx': ['paths'],
  'features/demo-console/DemoConsoleScreen.tsx': ['page-services'],
  'features/demo-console/routes.tsx': ['paths'],
  'features/last-battle/LastBattleScreen.tsx': ['page-services', 'paths'],
  'features/last-battle/NewSiteScreen.tsx': ['page-services', 'paths'],
  'features/last-battle/SiteScreen.tsx': ['page-services', 'paths'],
  'features/last-battle/SiteStatusAction.tsx': ['page-services'],
  'features/last-battle/routes.tsx': ['paths'],
  'features/live-photo/ArView.tsx': ['page-services'],
  'features/live-photo/LivePhotoScreen.tsx': ['page-services'],
  'features/live-photo/livePhotos.ts': ['page-services'],
  'features/live-photo/routes.tsx': ['paths'],
  'features/search-hq/DonateDialog.tsx': ['page-services'],
  'features/search-hq/NewRequestScreen.tsx': ['page-services', 'paths'],
  'features/search-hq/SearchScreen.tsx': ['page-services', 'paths'],
  'features/search-hq/routes.tsx': ['paths'],
}

type Rule = 'page-services' | 'function-purity' | 'core-independent' | 'pure-layers' | 'paths'

const RULE_TEXT: Record<Rule, string> = {
  'page-services':
    'экран или оболочка обращается к api/, platform/, react-query или app/services напрямую',
  'function-purity': 'функция содержит JSX, роутер, экран или app/ (сценарий — ещё и React)',
  'core-independent': 'functions/core зависит от функции',
  'pure-layers': 'domain/, contract/ или api/ импортирует React или роутер',
  paths: 'адрес экрана записан вне functions/core/paths.ts',
}

/** Корень композиции: здесь сервисы создаются и передаются в приложение. */
const COMPOSITION_ROOT = new Set(['main.tsx', 'app/App.tsx', 'app/services.tsx'])
/** Единственное место, где функции получают сервисы. */
const DEPS_HOOK = 'functions/core/useDeps.ts'
const PATHS_MODULE = 'functions/core/paths.ts'

/** Адрес экрана: '/trail', `/last-battle/${id}` в коде или path: 'search/requests/new' в роутере. */
const SCREENS =
  'trail|search|weekends|last-battle|archive|chronicle|live|demo|map|routes|places|help|trips|stories|profile'
const SCREEN_PATH = new RegExp(`['"\`]/(${SCREENS})(/|['"\`])|path: ['"\`](${SCREENS})(/|['"\`])`)

function listSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'test' ? [] : listSources(full)
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return []
    return [full]
  })
}

interface SourceFile {
  rel: string
  text: string
  /** Импорты как в коде: пакеты — по имени, свои файлы — путём от src без расширения. */
  imports: string[]
}

function readSource(full: string): SourceFile {
  const text = readFileSync(full, 'utf8')
  const info = ts.preProcessFile(text, true, true)
  const imports = info.importedFiles.map(({ fileName }) => {
    const spec = fileName.split('?')[0] ?? fileName
    if (!spec.startsWith('.')) return spec
    return toPosix(relative(SRC, join(dirname(full), spec))).replace(/\.tsx?$/, '')
  })
  return { rel: toPosix(relative(SRC, full)), text, imports }
}

const isPackage = (imp: string, name: string) => imp === name || imp.startsWith(`${name}/`)
const inDir = (path: string, dir: string) => path === dir || path.startsWith(`${dir}/`)
const functionOf = (path: string) =>
  inDir(path, 'functions') ? path.split('/')[1]?.replace(/\.tsx?$/, '') : undefined

/** Строки файла без комментариев — чтобы пример адреса в JSDoc не считался нарушением. */
function codeWithoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function violations(file: SourceFile): Rule[] {
  const found = new Set<Rule>()
  const { rel, imports } = file
  const isPage = inDir(rel, 'features') || inDir(rel, 'screens') || inDir(rel, 'app')
  if (isPage && !COMPOSITION_ROOT.has(rel)) {
    const bad = imports.some(
      (i) =>
        inDir(i, 'api') ||
        inDir(i, 'platform') ||
        i === 'app/services' ||
        isPackage(i, '@tanstack/react-query'),
    )
    if (bad) found.add('page-services')
  }

  if (inDir(rel, 'functions')) {
    const isHook = /(^|\/)use[A-Z][^/]*\.ts$/.test(rel)
    const bad =
      rel.endsWith('.tsx') ||
      imports.some(
        (i) =>
          isPackage(i, 'react-router') ||
          inDir(i, 'features') ||
          inDir(i, 'screens') ||
          (inDir(i, 'app') && !(rel === DEPS_HOOK && i === 'app/services')),
      ) ||
      (!isHook && imports.some((i) => isPackage(i, 'react') || isPackage(i, 'react-dom')))
    if (bad) found.add('function-purity')
    if (
      inDir(rel, 'functions/core') &&
      imports.some((i) => functionOf(i) && !inDir(i, 'functions/core'))
    )
      found.add('core-independent')
  }

  if (['domain', 'contract', 'api'].some((d) => inDir(rel, d))) {
    const bad =
      rel.endsWith('.tsx') ||
      imports.some((i) => ['react', 'react-dom', 'react-router'].some((p) => isPackage(i, p)))
    if (bad) found.add('pure-layers')
  }

  if (rel !== PATHS_MODULE && !inDir(rel, 'contract') && !inDir(rel, 'api')) {
    if (SCREEN_PATH.test(codeWithoutComments(file.text))) found.add('paths')
  }
  return [...found].sort()
}

/** Функции, входящие в цикл зависимостей (граф по папкам functions/<функция>). */
function functionsInCycles(files: SourceFile[]): string[] {
  const graph = new Map<string, Set<string>>()
  for (const f of files) {
    const from = functionOf(f.rel)
    if (!from) continue
    const edges = graph.get(from) ?? new Set<string>()
    for (const i of f.imports) {
      const to = functionOf(i)
      if (to && to !== from) edges.add(to)
    }
    graph.set(from, edges)
  }
  const inCycle = new Set<string>()
  const reaches = (start: string, target: string, seen = new Set<string>()): boolean => {
    for (const next of graph.get(start) ?? []) {
      if (next === target) return true
      if (!seen.has(next)) {
        seen.add(next)
        if (reaches(next, target, seen)) return true
      }
    }
    return false
  }
  for (const node of graph.keys()) if (reaches(node, node)) inCycle.add(node)
  return [...inCycle].sort()
}

const files = listSources(SRC).map(readSource)

describe('архитектура: функции отдельно от страниц (ADR 0008)', () => {
  it('нарушения совпадают со списком исключений: новых нет, лишних исключений нет', () => {
    const actual: Record<string, Rule[]> = {}
    for (const f of files) {
      const v = violations(f)
      if (v.length > 0) actual[f.rel] = v
    }
    const explain = (map: Record<string, readonly Rule[]>) =>
      Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([file, rules]) => `${file}: ${rules.map((r) => RULE_TEXT[r]).join('; ')}`)
    expect(explain(actual)).toEqual(explain(EXCEPTIONS))
  })

  it('между функциями нет циклов', () => {
    expect(functionsInCycles(files)).toEqual([])
  })

  it('исключения указывают на существующие файлы', () => {
    const known = new Set(files.map((f) => f.rel))
    expect(Object.keys(EXCEPTIONS).filter((f) => !known.has(f))).toEqual([])
  })
})

describe('правила ловят нарушения (самопроверка теста)', () => {
  const file = (rel: string, imports: string[], text = ''): SourceFile => ({ rel, imports, text })

  it('экран с прямым API, платформой, кэшем или сервисами', () => {
    for (const imp of ['api/index', 'platform/index', '@tanstack/react-query', 'app/services'])
      expect(violations(file('features/x/XScreen.tsx', [imp]))).toContain('page-services')
    expect(
      violations(file('features/x/XScreen.tsx', ['functions/quest/index', 'ui/Card'])),
    ).toEqual([])
  })

  it('функция с JSX, роутером, экраном или React в сценарии', () => {
    expect(violations(file('functions/quest/Quest.tsx', []))).toContain('function-purity')
    expect(violations(file('functions/quest/answer.ts', ['react-router']))).toContain(
      'function-purity',
    )
    expect(violations(file('functions/quest/answer.ts', ['react']))).toContain('function-purity')
    expect(
      violations(file('functions/quest/useQuest.ts', ['react', 'functions/core/useDeps'])),
    ).toEqual([])
    expect(violations(file('functions/core/useDeps.ts', ['react', 'app/services']))).toEqual([])
    expect(violations(file('functions/quest/useQuest.ts', ['app/services']))).toContain(
      'function-purity',
    )
  })

  it('core зависит от функции', () => {
    expect(violations(file('functions/core/paths.ts', ['functions/quest/index']))).toContain(
      'core-independent',
    )
  })

  it('чистые слои с React', () => {
    expect(violations(file('domain/trail.ts', ['react']))).toContain('pure-layers')
  })

  it('адрес экрана вне paths.ts, но не в комментарии', () => {
    expect(violations(file('features/x/X.tsx', [], "navigate('/search')"))).toContain('paths')
    expect(violations(file('features/x/routes.tsx', [], "{ path: 'trail/:id' }"))).toContain(
      'paths',
    )
    expect(
      violations(file('features/x/X.tsx', [], "// пример: '/search'\nconst s = 'search'")),
    ).toEqual([])
    expect(violations(file('functions/core/paths.ts', [], "const t = '/trail'"))).toEqual([])
  })

  it('цикл между функциями', () => {
    const graph = [
      file('functions/a/index.ts', ['functions/b/index']),
      file('functions/b/x.ts', ['functions/a/index']),
      file('functions/c/index.ts', ['functions/a/index']),
    ]
    expect(functionsInCycles(graph)).toEqual(['a', 'b'])
  })
})
