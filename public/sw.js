/*
 * 쉼표. 서비스 워커
 * - 화면(HTML): 항상 새 버전을 먼저 받고, 인터넷이 끊겼으면 저장해 둔 화면을 씁니다.
 * - 스크립트·글꼴·이미지: 한 번 받은 것은 저장해 두고 바로 씁니다(파일 이름에 버전이 들어 있음).
 * - 음원(mp3·m4a): 브라우저가 나눠서 받는 방식(Range)을 쓰므로 서비스 워커가 건드리지 않습니다.
 */
// 아래 두 값은 배포 빌드 때 scripts/pwa-precache.mjs가 채웁니다(모든 화면 코드·글꼴·아이콘).
const CACHE = 'shimpyo-dev';
const PRECACHE = [];
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png', ...PRECACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\.(mp3|m4a|wav)$/i.test(url.pathname) || req.headers.has('range')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
