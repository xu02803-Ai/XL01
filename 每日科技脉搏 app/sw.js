// Service Worker for PWA Installation Support
// STRATEGY: Network Only
// We DO NOT cache files in this development environment to prevent serving raw .tsx source code
// which causes the app to break (white screen).

const CACHE_NAME = 'techpulse-network-only-v2';

self.addEventListener('install', (event) => {
  // Force this new service worker to become the active one immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up any old caches that might contain broken/raw files
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  // Take control of all open pages immediately
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass all requests directly to the network
  // Do NOT cache anything here.
  event.respondWith(fetch(event.request));
});