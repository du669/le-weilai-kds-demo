// Replaces the earlier static demo service worker on the same localhost origin.
// The server version requires live API access and does not cache business data.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) {
    if (key.startsWith('le-weilai-kds-static-')) await caches.delete(key);
  }
  await self.registration.unregister();
  for (const client of await self.clients.matchAll({ type: 'window' })) {
    await client.navigate(client.url);
  }
})()));
