// 人生周历 Service Worker：离线可用（stale-while-revalidate）
// - 同源 GET 一律先回缓存、后台更新（Vite 产物带哈希，天然版本隔离）
// - 页面导航离线时回退到缓存的 index.html
const CACHE = 'life-weeks-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // API 与外链不缓存

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      const fetched = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone())
          return res
        })
        .catch(() => null)
      if (cached) {
        fetched.catch(() => {}) // 后台静默更新
        return cached
      }
      const res = await fetched
      if (res) return res
      // 离线且无缓存：导航请求回退到应用外壳
      if (req.mode === 'navigate') {
        const shell = await cache.match(new URL('./index.html', self.registration.scope).href)
        if (shell) return shell
      }
      return new Response('offline', { status: 503 })
    }),
  )
})
