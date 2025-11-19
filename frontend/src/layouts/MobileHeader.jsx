import { useState, useEffect } from 'react'

const MobileHeader = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [weather, setWeather] = useState({ temp: 72, location: 'Fort Collins' })

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <header className="mobile-header">
      <div className="header-left">
        <span className="time">{formatTime(currentTime)}</span>
        <span className="weather">{weather.temp}°F {weather.location}</span>
      </div>
      <button className="hamburger-menu" aria-label="Menu">
        ☰
      </button>
    </header>
  )
}

export default MobileHeader