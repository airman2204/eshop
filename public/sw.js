const CACHE_NAME = 'foxdrop-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/tienda',
  '/tienda/v2',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('Asset no disponible para cache offline:', asset);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo aplicar cache para navegación y recursos estáticos GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Evento PUSH para recibir notificaciones en segundo plano en celular y desktop
self.addEventListener('push', (event) => {
  let data = {
    title: '💬 Nuevo Mensaje FoxDrop',
    body: 'Tienes un nuevo mensaje de WhatsApp en FoxDrop',
    icon: '/foxdrop-icon.png',
    badge: '/favicon.ico',
    tag: 'whatsapp-message',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/foxdrop-icon.png',
    badge: data.badge || '/favicon.ico',
    vibrate: [200, 100, 200, 100, 250],
    tag: data.tag || 'whatsapp-message',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/admin?tab=whatsapp',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Al tocar la notificación en el celular, abrir la app en la bandeja de WhatsApp
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin?tab=whatsapp';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

