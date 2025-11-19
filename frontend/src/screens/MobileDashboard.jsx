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

  const [medicationProgress, setMedicationProgress] = useState({
    taken: 2,
    total: 4
  })

  const [hydrationProgress, setHydrationProgress] = useState({
    current: 24,
    goal: 64
  })

  const quickActions = [
    { id: 'video', icon: '🎥', label: 'Start Video Call', screen: 'video' },
    { id: 'meal', icon: '🍎', label: 'Log Meal', screen: 'nutrition' },
    { id: 'meds', icon: '💊', label: 'Take Meds', screen: 'medication' },
    { id: 'vitals', icon: '❤️', label: 'Check Vitals', screen: 'health' }
  ]

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = () => {
    // Load medication progress from localStorage
    const today = new Date().toISOString().split('T')[0]
    const medsData = localStorage.getItem(`medications_${today}`)
    if (medsData) {
      try {
        const meds = JSON.parse(medsData)
        const taken = meds.filter(m => m.taken).length
        setMedicationProgress({ taken, total: meds.length })
      } catch (error) {
        console.error('Error loading medication data:', error)
      }
    }

    // Load hydration progress from localStorage
    const hydrationData = localStorage.getItem(`hydration_${today}`)
    if (hydrationData) {
      try {
        const data = JSON.parse(hydrationData)
        setHydrationProgress({
          current: data.totalIntake || 0,
          goal: 64
        })
      } catch (error) {
        console.error('Error loading hydration data:', error)
      }
    }
  }

  const handleActionClick = (action) => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    onNavigate(action.screen)
  }

  const progressPercentage = (medicationProgress.taken / medicationProgress.total) * 100
  const hydrationPercentage = (hydrationProgress.current / hydrationProgress.goal) * 100

  return (
    <div className="mobile-dashboard">
      <h1 style={{ fontSize: '28px', marginBottom: '24px', fontWeight: '700' }}>
        Welcome Back
      </h1>

      {/* Quick Action Carousel */}
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

      {/* Progress Cards */}
      <section style={{ marginBottom: '24px' }}>
        {/* Medication Progress */}
        <div className="card-mobile interactive" onClick={() => onNavigate('medication')}>
          <h3>Medications</h3>
          <div className="progress-info">
            <span className="progress-text">
              {medicationProgress.taken}/{medicationProgress.total} taken today
            </span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${progressPercentage === 100 ? 'complete' : ''}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Hydration Progress */}
        <div className="card-mobile interactive" onClick={() => onNavigate('hydration')}>
          <h3>Hydration</h3>
          <div className="progress-info">
            <span className="progress-text">
              {hydrationProgress.current}/{hydrationProgress.goal} fl oz
            </span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${hydrationPercentage >= 100 ? 'complete' : ''}`}
              style={{ width: `${Math.min(hydrationPercentage, 100)}%` }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

export default MobileDashboard