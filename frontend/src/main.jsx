import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker, preloadCriticalResources } from './utils/serviceWorker.js'

// Initialize the app
async function initializeApp() {
  // Register service worker for offline capabilities
  if (import.meta.env.PROD) {
    // Only register service worker in production
    const registration = await registerServiceWorker()

    if (registration) {
      console.log('📱 App: Service worker registered successfully')

      // Preload critical resources
      await preloadCriticalResources([
        '/api/health',
        '/src/data/vitals.json',
        '/src/data/appointments.json'
      ])
    }
  } else {
    console.log('📱 App: Service worker disabled in development mode')
  }

  // Render the React app
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

// Start the app
initializeApp().catch(error => {
  console.error('📱 App: Initialization failed', error)

  // Still render the app even if service worker fails
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
