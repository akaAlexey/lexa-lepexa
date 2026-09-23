// Хук Claude Code (PostToolUse): форматирует prettier'ом только файлы внутри frontend/.
// Всё остальное (бэкенд, корень репо) не трогает. Ошибки не блокируют работу.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const frontend = resolve(import.meta.dirname, '..')
const exts = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.css', '.md', '.html'])

try {
  const input = JSON.parse(readFileSync(0, 'utf8'))
  const file = input?.tool_input?.file_path
  const rel = file ? relative(frontend, resolve(file)) : ''
  const prettier = join(frontend, 'node_modules', '.bin', 'prettier')
  if (
    rel &&
    !rel.startsWith('..') &&
    !rel.startsWith('node_modules') &&
    exts.has(extname(file)) &&
    existsSync(prettier)
  ) {
    execFileSync(prettier, ['--write', '--log-level', 'warn', '--ignore-unknown', file], {
      cwd: frontend,
      stdio: 'ignore',
    })
  }
} catch {
  // форматирование — удобство, а не проверка: verify всё равно запускает prettier --check
}
