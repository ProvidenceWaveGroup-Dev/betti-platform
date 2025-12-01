// Service Worker for Betti Mobile App
// Provides offline capabilities, caching, and background sync

const CACHE_NAME = 'betti-mobile-v1.0.0'
const STATIC_CACHE = 'betti-static-v1'
const DATA_CACHE = 'betti-data-v1'

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/manifest.json'
]

// API endpoints to cache
const DATA_URLS = [
  '/api/health',
  '/api/ble/status'
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('📱 Service Worker: Installing...')

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('📱 Service Worker: Caching static files')
        return cache.addAll(STATIC_FILES)
      }),
      caches.open(DATA_CACHE).then((cache) => {
        console.log('📱 Service Worker: Data cache ready')
        return cache
      })
    ])
  )

  // Force waiting service worker to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('📱 Service Worker: Activating...')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE) {
            console.log('📱 Service Worker: Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim()
    })
  )
})

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle static files
  event.respondWith(handleStaticRequest(request))
})

// Handle API requests with cache-first strategy for better offline experience
async function handleApiRequest(request) {
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DATA_CACHE)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }

    // If network fails, try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('📱 Service Worker: Serving cached API response for:', request.url)
      return cachedResponse
    }

    // Return offline fallback
    return createOfflineResponse(request)
  } catch (error) {
    console.log('📱 Service Worker: Network error, trying cache for:', request.url)

    // Try cache on network error
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Return offline fallback
    return createOfflineResponse(request)
  }
}

// Handle static file requests
async function handleStaticRequest(request) {
  try {
    // Try cache first for static files
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Try network if not in cache
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('📱 Service Worker: Failed to fetch:', request.url)

    // For navigation requests, return cached index.html
    if (request.mode === 'navigate') {
      const cachedPage = await caches.match('/index.html')
      if (cachedPage) {
        return cachedPage
      }
    }

    return createOfflineResponse(request)
  }
}

// Create offline fallback response
function createOfflineResponse(request) {
  if (request.url.includes('/api/')) {
    // Return offline data for API requests
    const offlineData = {
      offline: true,
      timestamp: new Date().toISOString(),
      message: 'You are currently offline. Some features may be limited.',
      data: getOfflineDataFallback(request.url)
    }

    return new Response(JSON.stringify(offlineData), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Return generic offline page for other requests
  return new Response(
    `
    <html>
      <head>
        <title>Betti Mobile - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 20px;
            background: #0a0a0a;
            color: white;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 100vh;
          }
          .offline-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          .retry-btn {
            background: #4a9eff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            margin-top: 20px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="offline-icon">📱</div>
        <h1>You're Offline</h1>
        <p>Betti Mobile is working offline. Some features may be limited.</p>
        <button class="retry-btn" onclick="window.location.reload()">
          Try Again
        </button>
      </body>
    </html>
    `,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

// Provide offline data fallbacks
function getOfflineDataFallback(url) {
  if (url.includes('/api/health')) {
    return {
      status: 'offline',
      lastSync: localStorage.getItem('lastHealthSync') || null,
      vitals: {
        heartRate: 72,
        bloodPressure: '120/80',
        temperature: 98.6,
        oxygenSaturation: 98
      }
    }
  }

  if (url.includes('/api/ble')) {
    return {
      scanning: false,
      devices: [],
      message: 'Bluetooth scanning unavailable offline'
    }
  }

  return {}
}

// Background sync for when connection returns
self.addEventListener('sync', (event) => {
  console.log('📱 Service Worker: Background sync triggered:', event.tag)

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  console.log('📱 Service Worker: Performing background sync...')

  try {
    // Sync any pending data when connection returns
    const pendingData = await getPendingData()

    if (pendingData.length > 0) {
      for (const data of pendingData) {
        await syncDataItem(data)
      }
      await clearPendingData()
    }

    // Refresh cache with latest data
    await refreshDataCache()

    console.log('📱 Service Worker: Background sync completed')
  } catch (error) {
    console.error('📱 Service Worker: Background sync failed:', error)
  }
}

// Helper functions for background sync
async function getPendingData() {
  // This would typically read from IndexedDB
  const pending = localStorage.getItem('pendingSync')
  return pending ? JSON.parse(pending) : []
}

async function syncDataItem(data) {
  try {
    const response = await fetch(data.url, {
      method: data.method,
      headers: data.headers,
      body: data.body
    })

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`)
    }

    console.log('📱 Service Worker: Synced data item:', data.id)
  } catch (error) {
    console.error('📱 Service Worker: Failed to sync data item:', data.id, error)
    throw error
  }
}

async function clearPendingData() {
  localStorage.removeItem('pendingSync')
}

async function refreshDataCache() {
  const cache = await caches.open(DATA_CACHE)

  // Refresh commonly used endpoints
  for (const url of DATA_URLS) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        await cache.put(url, response)
      }
    } catch (error) {
      console.log('📱 Service Worker: Failed to refresh cache for:', url)
    }
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📱 Service Worker: Push notification received')

  const options = {
    body: 'You have new health updates available.',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: { action: 'open-app' },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('Betti Mobile', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Service Worker: Notification clicked')

  event.notification.close()

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})