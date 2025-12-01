/**
 * Service Worker registration and management
 * Provides offline capabilities and background sync
 */

// Check if service workers are supported
const isSupported = 'serviceWorker' in navigator

// Service worker registration
export async function registerServiceWorker() {
  if (!isSupported) {
    console.log('📱 Service Worker: Not supported in this browser')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    console.log('📱 Service Worker: Registered successfully', registration)

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('📱 Service Worker: New version available')

          // Notify user about update
          showUpdateNotification()
        }
      })
    })

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)

    return registration
  } catch (error) {
    console.error('📱 Service Worker: Registration failed', error)
    return false
  }
}

// Unregister service worker
export async function unregisterServiceWorker() {
  if (!isSupported) return false

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      const result = await registration.unregister()
      console.log('📱 Service Worker: Unregistered', result)
      return result
    }
  } catch (error) {
    console.error('📱 Service Worker: Unregistration failed', error)
  }

  return false
}

// Check if app is running offline
export function isOffline() {
  return !navigator.onLine
}

// Get network status
export function getNetworkStatus() {
  return {
    online: navigator.onLine,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    } : null
  }
}

// Background sync registration
export async function registerBackgroundSync(tag = 'background-sync') {
  if (!isSupported) return false

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration && registration.sync) {
      await registration.sync.register(tag)
      console.log('📱 Service Worker: Background sync registered')
      return true
    }
  } catch (error) {
    console.error('📱 Service Worker: Background sync registration failed', error)
  }

  return false
}

// Cache management
export async function clearCache() {
  if (!('caches' in window)) return false

  try {
    const cacheNames = await caches.keys()

    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    )

    console.log('📱 Service Worker: All caches cleared')
    return true
  } catch (error) {
    console.error('📱 Service Worker: Cache clearing failed', error)
    return false
  }
}

// Get cache status
export async function getCacheStatus() {
  if (!('caches' in window)) return null

  try {
    const cacheNames = await caches.keys()
    const cacheInfo = []

    for (const name of cacheNames) {
      const cache = await caches.open(name)
      const keys = await cache.keys()

      cacheInfo.push({
        name,
        entries: keys.length,
        urls: keys.slice(0, 5).map(req => req.url) // First 5 URLs for preview
      })
    }

    return {
      totalCaches: cacheNames.length,
      caches: cacheInfo
    }
  } catch (error) {
    console.error('📱 Service Worker: Cache status check failed', error)
    return null
  }
}

// Store data for offline sync
export function storeOfflineData(data) {
  try {
    const existing = localStorage.getItem('pendingSync')
    const pending = existing ? JSON.parse(existing) : []

    pending.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...data
    })

    localStorage.setItem('pendingSync', JSON.stringify(pending))

    // Register background sync
    registerBackgroundSync()

    console.log('📱 Service Worker: Data stored for offline sync')
    return true
  } catch (error) {
    console.error('📱 Service Worker: Failed to store offline data', error)
    return false
  }
}

// Handle service worker messages
function handleServiceWorkerMessage(event) {
  const { type, payload } = event.data

  console.log('📱 Service Worker: Message received', { type, payload })

  switch (type) {
    case 'CACHE_UPDATED':
      console.log('📱 Service Worker: Cache updated')
      break

    case 'OFFLINE_FALLBACK':
      console.log('📱 Service Worker: Serving offline content')
      showOfflineNotification()
      break

    case 'SYNC_COMPLETE':
      console.log('📱 Service Worker: Background sync completed')
      showSyncCompleteNotification()
      break

    default:
      console.log('📱 Service Worker: Unknown message type', type)
  }
}

// Show update notification
function showUpdateNotification() {
  // This could integrate with a toast notification system
  console.log('📱 New version available! Refresh to update.')

  // Create a simple notification
  const notification = document.createElement('div')
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4a9eff;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 10000;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `
  notification.textContent = '🔄 App update available - Tap to refresh'
  notification.onclick = () => window.location.reload()

  document.body.appendChild(notification)

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification)
    }
  }, 10000)
}

// Show offline notification
function showOfflineNotification() {
  console.log('📱 You are offline. Some features may be limited.')
}

// Show sync complete notification
function showSyncCompleteNotification() {
  console.log('📱 Data synced successfully!')
}

// Network status monitoring
let networkListeners = []

export function addNetworkListener(callback) {
  networkListeners.push(callback)

  // Add event listeners if this is the first callback
  if (networkListeners.length === 1) {
    window.addEventListener('online', handleNetworkChange)
    window.addEventListener('offline', handleNetworkChange)
  }
}

export function removeNetworkListener(callback) {
  const index = networkListeners.indexOf(callback)
  if (index > -1) {
    networkListeners.splice(index, 1)
  }

  // Remove event listeners if no callbacks remain
  if (networkListeners.length === 0) {
    window.removeEventListener('online', handleNetworkChange)
    window.removeEventListener('offline', handleNetworkChange)
  }
}

function handleNetworkChange() {
  const status = getNetworkStatus()

  networkListeners.forEach(callback => {
    try {
      callback(status)
    } catch (error) {
      console.error('📱 Network listener error:', error)
    }
  })

  if (status.online) {
    console.log('📱 Network: Back online')
    registerBackgroundSync() // Trigger sync when back online
  } else {
    console.log('📱 Network: Gone offline')
  }
}

// Preload critical resources
export async function preloadCriticalResources(urls) {
  if (!('caches' in window)) return

  try {
    const cache = await caches.open('betti-preload')

    const responses = await Promise.allSettled(
      urls.map(url => fetch(url))
    )

    const successful = responses
      .filter(result => result.status === 'fulfilled' && result.value.ok)
      .map(result => result.value)

    await Promise.all(
      successful.map(response => cache.put(response.url, response.clone()))
    )

    console.log(`📱 Service Worker: Preloaded ${successful.length} critical resources`)
  } catch (error) {
    console.error('📱 Service Worker: Preloading failed', error)
  }
}