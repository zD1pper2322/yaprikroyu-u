// Service Worker для "Я прикрою!"
// Задача: дать браузеру повод предложить «Установить приложение»
// и обеспечить базовую офлайн-работу (данные всё равно хранятся
// в localStorage на устройстве, так что список товаров доступен
// даже без интернета — нужно лишь чтобы саму страницу отдало из кэша).

const CACHE_NAME = 'ya-prikroyu-v1';
const FILES_TO_CACHE = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Сеть в приоритете (чтобы видеть свежую версию), кэш — как запасной
  // вариант, если соединения нет.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          try { cache.put(event.request, copy); } catch (e) {}
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
