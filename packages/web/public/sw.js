const CACHE = 'homeservice-v2'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled([c.add('/'), c.add('/offline')]))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  if (url.origin !== location.origin) return

  // Network-first for API — return 503 JSON when offline
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ success: false, error: 'Офлайн горим' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    return
  }

  // Network-first for Next.js static chunks — ensures dev rebuilds always land
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const toCache = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, toCache))
        return res
      }).catch(() => caches.match(e.request).then((cached) =>
        cached ?? new Response('', { status: 408 })
      ))
    )
    return
  }

  // Network-first with cache fallback for pages and other assets
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const toCache = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, toCache))
        }
        return res
      })
      .catch(() =>
        caches.match(e.request).then((cached) =>
          cached ?? (e.request.mode === 'navigate'
            ? caches.match('/offline')
            : new Response('', { status: 408 }))
        )
      )
  )
})
