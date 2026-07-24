/**
 * SIMKAS - Service Worker
 * Meng-cache "app shell" (HTML, manifest, ikon) agar aplikasi tetap bisa
 * dibuka saat offline / koneksi lambat. Data transaksi tetap butuh koneksi
 * karena diambil live dari Apps Script + Google Sheets.
 */

const CACHE_NAME = 'simkas-cache-v4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

// Install: simpan app shell ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: bersihkan cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Panggilan ke Apps Script (script.google.com) SELALU lewat network,
//   tidak boleh di-cache, karena itu data live (transaksi, pegawai, dll).
// - Aset app shell (HTML/CSS/JS/ikon): cache-first, fallback ke network,
//   lalu update cache di background (stale-while-revalidate).
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Jangan pernah cache request ke backend Apps Script
  if (url.includes('script.google.com')) {
    return; // biarkan request jalan normal ke network
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline: pakai cache jika network gagal

      return cached || networkFetch;
    })
  );
});
