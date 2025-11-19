import { useState, useEffect } from 'react'

// Import components normally - let React handle any import errors
import MobileHeader from './MobileHeader'
import MobileNav from './MobileNav'
import MobileDashboard from '../screens/MobileDashboard'

const MobileLayout = ({ panelState, setPanelState, deviceInfo = {} }) => {
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [debugInfo, setDebugInfo] = useState({})

  // Comprehensive debugging on mount
  useEffect(() => {
    try {
      const info = {
        userAgent: navigator.userAgent,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        screenSize: `${screen.width}x${screen.height}`,
        devicePixelRatio: window.devicePixelRatio,
        timestamp: new Date().toISOString(),
        components: {
          MobileHeader: typeof MobileHeader === 'function',
          MobileNav: typeof MobileNav === 'function',
          MobileDashboard: typeof MobileDashboard === 'function'
        },
        deviceDetection: {
          deviceType: deviceInfo.deviceType || 'unknown',
          confidence: deviceInfo.confidence || 0,
          isMobile: deviceInfo.isMobile,
          isPixel: /Pixel/i.test(navigator.userAgent),
          isAndroid: /Android/i.test(navigator.userAgent)
        }
      }
      setDebugInfo(info)
      console.log('📱 MobileLayout DEBUG INFO:', info)
    } catch (error) {
      console.error('📱 Error collecting debug info:', error)
    }
  }, [])

  console.log('📱 MobileLayout: Rendering with activeScreen:', activeScreen)
  console.log('📱 MobileLayout: Window size:', window.innerWidth, 'x', window.innerHeight)

  const handleNavigate = (screen) => {
    setActiveScreen(screen)
    setShowMoreMenu(false)
  }

  const renderScreen = () => {
    console.log('📱 MobileLayout: renderScreen called for:', activeScreen)

    try {
      switch (activeScreen) {
        case 'dashboard':
          if (typeof MobileDashboard === 'function') {
            console.log('📱 Rendering MobileDashboard component')
            return <MobileDashboard onNavigate={handleNavigate} />
          } else {
            console.warn('📱 MobileDashboard not available, using fallback')
            return (
              <div style={{ padding: '20px', background: '#2a2a2a', color: 'white', borderRadius: '8px' }}>
                <h2>📊 Dashboard (Fallback Mode)</h2>
                <p>Welcome to Betti Mobile</p>
                <div style={{ marginTop: '20px', padding: '10px', background: '#1a1a1a', borderRadius: '4px' }}>
                  <h3>Quick Stats</h3>
                  <p>❤️ Heart Rate: 72 bpm</p>
                  <p>🩸 BP: 120/80</p>
                  <p>🌡️ Temp: 98.6°F</p>
                </div>
                <div style={{ marginTop: '20px' }}>
                  <button
                    style={{
                      background: '#4a9eff',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    onClick={() => handleNavigate('health')}
                  >
                    View Health Details
                  </button>
                </div>
              </div>
            )
          }
        case 'health':
          return (
            <div className="mobile-screen" style={{ padding: '20px', color: 'white' }}>
              <h2>🏥 Health Screen</h2>
              <p>Health vitals coming soon...</p>
              <div style={{ marginTop: '20px', padding: '15px', background: '#2a2a2a', borderRadius: '8px' }}>
                <h3>Current Vitals</h3>
                <p>All systems operational</p>
              </div>
            </div>
          )
        case 'schedule':
          return (
            <div className="mobile-screen" style={{ padding: '20px', color: 'white' }}>
              <h2>📅 Schedule</h2>
              <p>Appointments coming soon...</p>
              <div style={{ marginTop: '20px', padding: '15px', background: '#2a2a2a', borderRadius: '8px' }}>
                <h3>Next Appointment</h3>
                <p>10:00 AM - Doctor Visit</p>
              </div>
            </div>
          )
        case 'medication':
          return (
            <div className="mobile-screen" style={{ padding: '20px', color: 'white' }}>
              <h2>💊 Medications</h2>
              <p>Medication tracking coming soon...</p>
              <div style={{ marginTop: '20px', padding: '15px', background: '#2a2a2a', borderRadius: '8px' }}>
                <h3>Today's Medications</h3>
                <p>2 of 4 taken</p>
              </div>
            </div>
          )
        default:
          return (
            <div style={{ padding: '20px', color: 'white', background: '#2a2a2a', borderRadius: '8px', margin: '10px' }}>
              <h2>🏠 Dashboard (Unknown Screen)</h2>
              <p>Welcome to Betti Mobile</p>
              <p>Active screen: <strong>{activeScreen}</strong></p>
              <p>Time: {new Date().toLocaleString()}</p>
              <div style={{ marginTop: '20px' }}>
                <button
                  style={{
                    background: '#4a9eff',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                  onClick={() => setActiveScreen('dashboard')}
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )
      }
    } catch (error) {
      console.error('📱 renderScreen Error:', error)
      return (
        <div style={{
          padding: '20px',
          background: 'linear-gradient(45deg, #ff6600, #ff0000)',
          color: 'white',
          borderRadius: '8px',
          margin: '10px'
        }}>
          <h2>⚠️ Screen Render Error</h2>
          <p><strong>Error:</strong> {error.message}</p>
          <p><strong>Screen:</strong> {activeScreen}</p>
          <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
          <button
            style={{
              background: 'white',
              color: 'red',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              marginTop: '10px'
            }}
            onClick={() => {
              setActiveScreen('dashboard')
              window.location.reload()
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }
  }

  try {
    return (
      <div className="mobile-app" style={{ background: '#0a0a0a', minHeight: '100vh' }}>

        {/* Mobile Header */}
        {typeof MobileHeader === 'function' ? (
          <MobileHeader />
        ) : (
          <div style={{
            background: '#1a1a1a',
            padding: '12px',
            color: 'white',
            fontSize: '14px',
            borderBottom: '1px solid #333'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🏥 Betti Mobile (Fallback Header)</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        <main className="mobile-content" style={{ flex: 1, padding: '16px', paddingTop: '80px', paddingBottom: '104px' }}>
          {renderScreen()}
        </main>

        {/* Mobile Navigation */}
        <MobileNav
          activeScreen={activeScreen}
          onNavigate={handleNavigate}
          onShowMore={() => setShowMoreMenu(true)}
        />

        {showMoreMenu && (
          <div
            className="more-menu-placeholder"
            onClick={() => setShowMoreMenu(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000
            }}
          >
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', color: 'black' }}>
              <p>More menu coming soon...</p>
              <p>Tap to close</p>
            </div>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('📱 MobileLayout Error:', error)
    return (
      <div style={{ background: 'red', color: 'white', padding: '20px' }}>
        <h1>Mobile Layout Error</h1>
        <p>{error.message}</p>
        <pre>{error.stack}</pre>
      </div>
    )
  }
}

export default MobileLayout