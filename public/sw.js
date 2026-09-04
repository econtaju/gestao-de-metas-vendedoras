// Service Worker - MetaRentável (FP&A Comercial)
// Versão do Cache para resiliência Offline-First
const CACHE_NAME = 'gmc-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Aviso ao pré-carregar assets iniciais:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignora requisições que não sejam GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Ignora chamadas de API externas e Supabase (deixando para o offlineSyncService gerenciar)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('resend.com') ||
    url.pathname.startsWith('/rest/v1/')
  ) {
    return;
  }

  // Requisições de navegação de página (HTML principal)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Se estiver offline ao navegar ou dar F5, retorna o index.html salvo em cache
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
          return new Response('Modo Offline: Aplicativo carregando do cache...', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Para arquivos estáticos do Vite (scripts, estilos, fontes, imagens)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Atualiza cache em segundo plano (Stale-While-Revalidate)
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Se não estava em cache, busca na rede e armazena
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Se for imagem ou recurso estático não disponível, retorna vazio gracioso
          return new Response('', { status: 408, statusText: 'Offline' });
        });
    })
  );
});
