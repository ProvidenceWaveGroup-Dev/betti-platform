import React, { useState, useEffect } from 'react'
import './Header.css'

function Header() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <header className="header">
      <div className="header-left">
        <img
          src="/Betti Logo TM.png"
          alt="Betti Logo"
          className="betti-logo"
        />
      </div>

      <div className="header-center">
        <div className="weather-widget">
          <div className="weather-location">Fort Collins, CO</div>
          <div className="weather-info">
            <span className="weather-icon">☀️</span>
            <span className="weather-temp">72°F</span>
          </div>
          <div className="weather-condition">Sunny</div>
        </div>
      </div>

      <div className="header-right">
        <div className="time-display">{formatTime(currentTime)}</div>
        <div className="date-display">{formatDate(currentTime)}</div>
      </div>
    </header>
  )
}

export default Header
