/* Офлайн для «Тропы памяти» (X5). Без сборщика и библиотек: файл кладётся в корень сайта как есть.
 * - страницы: сначала сеть, без сети — сохранённая оболочка приложения (index.html);
 * - файлы сайта (JS, CSS, картинки, воркер карты): отдаём сохранённое, обновляем в фоне;
 * - подложка карты и библиотеки AR с CDN: сохраняем по мере просмотра, подложку — не больше TILE_LIMIT;
 * - API и видео не кэшируем: данные свежие, ролики большие и идут кусками (Range). */
const SHELL = 'tropa-shell-v1'
const TILES = 'tropa-tiles-v1'
const CDN = 'tropa-cdn-v1'
const KEEP = [SHELL, TILES, CDN]
const TILE_LIMIT = 600
const TILE_HOSTS = ['tiles.openfreemap.org']
const CDN_HOSTS = ['cdn.jsdelivr.net']

const scoped = (path) => new URL(path, self.registration.scope).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll([scoped('./'), scoped('index.html'), scoped('manifest.webmanifest')]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (const key of keys.slice(0, Math.max(0, keys.length - limit))) await cache.delete(key)
}

async function staleWhileRevalidate(request, cacheName, limit) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') {
        cache.put(request, response.clone())
        if (limit) trim(cacheName, limit)
      }
      return response
    })
    .catch(() => undefined)
  return cached || (await fresh) || Response.error()
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request)
    if (response.ok) (await caches.open(SHELL)).put(scoped('index.html'), response.clone())
    return response
  } catch {
    const cache = await caches.open(SHELL)
    return (
      (await cache.match(scoped('index.html'))) ||
      (await cache.match(scoped('./'))) ||
      Response.error()
    )
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || request.headers.has('range')) return
  const url = new URL(request.url)

  if (url.origin === self.location.origin) {
    if (!url.href.startsWith(self.registration.scope)) return
    if (request.mode === 'navigate') return event.respondWith(networkFirstPage(request))
    if (/\.(mp4|webm|vtt)$/.test(url.pathname) || url.pathname.includes('/api/')) return
    return event.respondWith(staleWhileRevalidate(request, SHELL))
  }
  if (TILE_HOSTS.includes(url.hostname))
    return event.respondWith(staleWhileRevalidate(request, TILES, TILE_LIMIT))
  if (CDN_HOSTS.includes(url.hostname)) return event.respondWith(staleWhileRevalidate(request, CDN))
})
