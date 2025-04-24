const CACHE_NAME = 'new-flightinfo-pwa-v3.1';
const BASE = self.location.pathname.replace(/\/[^/]*$/, '');

const urlsToCache = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/favicon.ico`,
  `${BASE}/logo192.png`,
  `${BASE}/logo512.png`,
  `${BASE}/manifest.json`,
  `${BASE}/static/css/main.css`,
  `${BASE}/static/js/main.js`
];

// ----------- INSTALL ----------
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn('[SW] Failed to cache during install:', url, err);
        }
      }
    })
  );
});

// ----------- ACTIVATE ----------
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ----------- FETCH ----------
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// ----------- SYNC EVENT ----------
self.addEventListener('sync', event => {
  if (event.tag === 'sync-requests') {
    console.log('[Service Worker] Sync event triggered for saved requests');
    event.waitUntil(syncOfflineRequests());
  }
});

// ----------- SYNC FUNCTION ----------
async function syncOfflineRequests() {
  console.log('[Service Worker] Trying to sync offline requests...');
  try {
    const db = await openDatabase();
    const tx = db.transaction('requests', 'readonly');
    const store = tx.objectStore('requests');
    const getAll = store.getAll();

    const savedRequests = await new Promise((resolve, reject) => {
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject('Failed to fetch saved requests');
    });

    for (const request of savedRequests) {
      try {
        await fetch('https://jsonplaceholder.typicode.com/posts', {
          method: 'POST',
          body: JSON.stringify(request),
          headers: { 'Content-Type': 'application/json' }
        });

        const deleteTx = db.transaction('requests', 'readwrite');
        const deleteStore = deleteTx.objectStore('requests');
        deleteStore.delete(request.timestamp);
        await new Promise((resolve, reject) => {
          deleteTx.oncomplete = resolve;
          deleteTx.onerror = reject;
        });

        console.log('[SW] Synced & deleted:', request);
      } catch (error) {
        console.error('[SW] Failed to sync request:', request, error);
      }
    }

    // ✅ Only show notification if permission is granted
    if (self.registration.showNotification && Notification.permission === 'granted') {
      self.registration.showNotification('Offline Requests Synced!', {
        body: 'All your saved flight requests were submitted.',
        icon: `${BASE}/logo192.png`
      });
    }

    db.close();
  } catch (error) {
    console.error('[SW] Error during sync:', error);
  }
}

// ----------- OPEN IndexedDB ----------
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AeroDB', 2);
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = () => reject('IndexedDB open failed');
  });
}