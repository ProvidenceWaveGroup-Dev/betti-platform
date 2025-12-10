const MobileNav = ({ activeScreen, onNavigate }) => {
  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Home' },
    { id: 'health', icon: '❤️', label: 'Health' },
    { id: 'schedule', icon: '📅', label: 'Schedule' },
    { id: 'medication', icon: '💊', label: 'Meds' },
    { id: 'nutrition', icon: '🍎', label: 'Nutrition' },
    { id: 'fitness', icon: '🏃', label: 'Fitness' },
    { id: 'hydration', icon: '💧', label: 'Hydration' },
    { id: 'environment', icon: '🌡️', label: 'Environ' },
    { id: 'video', icon: '📞', label: 'Video' }
  ]

  const handleClick = (itemId) => {
    // Haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
    onNavigate(itemId)
  }

  return (
    <nav
      className="mobile-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '80px',
        paddingTop: '12px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        background: 'rgba(26, 26, 26, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        boxSizing: 'border-box',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
        WebkitOverflowScrolling: 'touch' // iOS smooth scrolling
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          minWidth: 'max-content',
          height: '100%',
          paddingLeft: '8px',
          paddingRight: '8px'
        }}
      >
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeScreen === item.id ? 'active' : ''}`}
            onClick={() => handleClick(item.id)}
            aria-label={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              color: activeScreen === item.id ? '#4a9eff' : 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '8px 12px',
              minHeight: '56px',
              minWidth: '72px',
              flexShrink: 0,
              transition: 'all 150ms ease'
            }}
          >
            <span
              className="nav-icon"
              style={{
                fontSize: '24px',
                transform: activeScreen === item.id ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 150ms ease'
              }}
            >
              {item.icon}
            </span>
            <span
              className="nav-label"
              style={{
                fontSize: '10px',
                fontWeight: 500,
                textAlign: 'center',
                lineHeight: 1.2,
                whiteSpace: 'nowrap'
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Hide scrollbar with CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .mobile-nav::-webkit-scrollbar {
            display: none;
          }
        `
      }} />
    </nav>
  )
}

export default MobileNav