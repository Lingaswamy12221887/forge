// App-shell cache. Only same-origin GETs are cached; API calls (Supabase) are never intercepted.
const C = 'forge-shell-v1'
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(['/', '/icon.svg']))); self.skipWaiting() })
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))))
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url)
  if (r.method !== 'GET' || u.origin !== location.origin) return
  if (r.mode === 'navigate') return e.respondWith(fetch(r).catch(() => caches.match('/')))
  e.respondWith(caches.match(r).then(h => h || fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)) } return res })))
})
