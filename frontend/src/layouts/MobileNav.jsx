const MobileNav = ({ activeScreen, onNavigate, onShowMore }) => {
  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Home' },
    { id: 'health', icon: '❤️', label: 'Health' },
    { id: 'schedule', icon: '📅', label: 'Schedule' },
    { id: 'medication', icon: '💊', label: 'Meds' },
    { id: 'more', icon: '⋯', label: 'More' }
  ]

  const handleClick = (itemId) => {
    // Haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }

    if (itemId === 'more') {
      onShowMore()
    } else {
      onNavigate(itemId)
    }
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
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-item ${activeScreen === item.id ? 'active' : ''}`}
          onClick={() => handleClick(item.id)}
          aria-label={item.label}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: activeScreen === item.id ? '#4a9eff' : 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            padding: '8px 4px',
            minHeight: '56px',
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
              fontSize: '11px',
              fontWeight: 500,
              textAlign: 'center',
              lineHeight: 1.2
            }}
          >
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  )
}

export default MobileNav