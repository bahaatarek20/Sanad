// Service Worker for Sanad Scholarly Platform (رفيق طالب العلم بلا إنترنت)
const CACHE_NAME = 'sanad-scholarly-cache-v1'
const OFFLINE_URL = '/offline'

// الملفات والصفحات الأساسية المخبأة مسبقاً للعمل دون اتصال
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/courses',
  '/favicon.ico',
  '/manifest.webmanifest',
]

// تثبيت الـ Service Worker وحفظ الأصول الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache failed for some assets, continuing...', err)
      })
    })
  )
  self.skipWaiting()
})

// تفعيل وتنظيف النسخ القديمة من الكاش
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('sanad-')) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// اعتراض الطلبات واستراتيجية العمل بلا إنترنت
self.addEventListener('fetch', (event) => {
  const { request } = event

  // تجاهل الطلبات غير الـ GET أو طلبات الـ Chrome Extensions
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return
  }

  // لطلبات صفحات التنقل (HTML Navigations)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // إذا كان الاتصال متاحاً، نخزن نسخة من الصفحة للعمل بلا إنترنت
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(async () => {
          // في حال انقطاع النت تماماً (في المسجد أو السفر)
          const cache = await caches.open(CACHE_NAME)
          const cachedResponse = await cache.match(request)
          if (cachedResponse) {
            return cachedResponse
          }
          // إذا لم تكن الصفحة مخبأة، نوجهه لصفحة وضع المسجد بلا إنترنت
          const offlinePage = await cache.match(OFFLINE_URL)
          if (offlinePage) {
            return offlinePage
          }
          return new Response(
            '<html><head><meta charset="utf-8"><title>وضع بلا إنترنت || منصة سَنَد</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;direction:rtl;background:#fcf9f2;color:#1c1917;"><h2>أنت الآن في وضع المدارسة بلا إنترنت</h2><p>يمكنك فتح المتون التي قمت بحفظها مسبقاً في كشكولك.</p><a href="/offline" style="color:#064e3b;font-weight:bold;">انتقل لصفحة المتون المحفوظة ←</a></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        })
    )
    return
  }

  // للملفات الثابتة (Static Assets, Fonts, Images, CSS)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // تحديث في الخلفية (Stale-While-Revalidate)
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse)
              })
            }
          })
          .catch(() => {})
        return cachedResponse
      }

      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return networkResponse
        })
        .catch(() => {
          // في حال فشل جلب صورة أو خط بلا إنترنت
          return new Response('', { status: 408, headers: { 'Content-Type': 'text/plain' } })
        })
    })
  )
})
