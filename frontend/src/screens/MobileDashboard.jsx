import { useState, useEffect } from 'react'
import '../styles/mobileDashboard.scss'

const MobileDashboard = ({ onNavigate }) => {
  const [quickStats, setQuickStats] = useState({
    bp: '120/80',
    hr: '72 bpm',
    o2: '98%',
    temp: '98.6°F'
  })

  const [nextAppointment, setNextAppointment] = useState({
    time: '10:00 AM',
    title: 'Doctor Visit',
    subtitle: 'Dr. Smith',
    countdown: 'In 2 hours'
  })

  // Quick actions that match mobile navigation
  const quickActions = [
    { id: 'health', icon: '❤️', label: 'Health Vitals', screen: 'health' },
    { id: 'schedule', icon: '📅', label: 'Schedule', screen: 'schedule' },
    { id: 'medication', icon: '💊', label: 'Medication', screen: 'medication' },
    { id: 'nutrition', icon: '🍎', label: 'Nutrition', screen: 'nutrition' }
  ]

  const handleActionClick = (action) => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    onNavigate(action.screen)
  }

  return (
    <div className="mobile-dashboard">

      {/* Quick Action Buttons */}
      <section style={{ marginBottom: '24px' }}>
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          {quickActions.map(action => (
            <button
              key={action.id}
              className="action-card"
              onClick={() => handleActionClick(action)}
            >
              <div className="action-icon">{action.icon}</div>
              <div className="action-label">{action.label}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Today's Stats Card */}
      <section style={{ marginBottom: '24px' }}>
        <div className="card-mobile">
          <h3>Today's Health Stats</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="label">BP</div>
              <div className="value">{quickStats.bp}</div>
            </div>
            <div className="info-item">
              <div className="label">HR</div>
              <div className="value">{quickStats.hr}</div>
            </div>
            <div className="info-item">
              <div className="label">O2</div>
              <div className="value">{quickStats.o2}</div>
            </div>
            <div className="info-item">
              <div className="label">Temp</div>
              <div className="value">{quickStats.temp}</div>
            </div>
          </div>
          <div className="status">
            <div className="dot"></div>
            <span>All Normal</span>
          </div>
        </div>
      </section>

      {/* Next Appointment Card */}
      <section style={{ marginBottom: '24px' }}>
        <div className="card-mobile interactive" onClick={() => onNavigate('schedule')}>
          <h3>Next Appointment</h3>
          <div className="appointment-info">
            <div className="appointment-details">
              <div className="time">{nextAppointment.time}</div>
              <div className="title">{nextAppointment.title}</div>
              <div className="subtitle">{nextAppointment.subtitle}</div>
            </div>
            <div className="countdown">{nextAppointment.countdown}</div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default MobileDashboard