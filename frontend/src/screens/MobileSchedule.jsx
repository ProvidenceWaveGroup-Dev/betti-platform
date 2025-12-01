import { useState, useEffect } from 'react'
import '../styles/mobileSchedule.scss'

const MobileSchedule = ({ onNavigate }) => {
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    fetch('/src/data/appointments.json')
      .then(response => response.json())
      .then(data => setAppointments(data))
      .catch(error => console.error('Error loading appointments:', error))
  }, [])

  const getTypeIcon = (type) => {
    switch (type) {
      case 'medical': return '🏥'
      case 'medication': return '💊'
      case 'therapy': return '🤸'
      case 'personal': return '👥'
      default: return '📅'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'medical': return '#22c55e'
      case 'medication': return '#8b5cf6'
      case 'therapy': return '#f59e0b'
      case 'personal': return '#06b6d4'
      default: return '#64748b'
    }
  }

  const formatTime = (time) => {
    return time
  }

  const getNextAppointment = () => {
    if (appointments.length === 0) return null
    return appointments[0]
  }

  const nextAppointment = getNextAppointment()

  return (
    <div className="mobile-schedule">
      <h2>Today's Schedule</h2>
      <div className="schedule-summary">
        <span className="event-count">{appointments.length} events today</span>
        {nextAppointment && (
          <span className="next-up">
            Next: {nextAppointment.time} - {nextAppointment.title}
          </span>
        )}
      </div>

      {/* Current/Next Appointment Highlight */}
      {nextAppointment && (
        <section className="next-appointment-card">
          <div className="appointment-header">
            <span className="appointment-icon" style={{ color: getTypeColor(nextAppointment.type) }}>
              {getTypeIcon(nextAppointment.type)}
            </span>
            <div className="appointment-timing">
              <div className="appointment-time">{formatTime(nextAppointment.time)}</div>
              <div className="time-until">Coming up</div>
            </div>
          </div>
          <div className="appointment-details">
            <h3 className="appointment-title">{nextAppointment.title}</h3>
            {nextAppointment.location && (
              <div className="appointment-location">
                <span className="location-icon">📍</span>
                {nextAppointment.location}
              </div>
            )}
            {nextAppointment.notes && (
              <div className="appointment-notes">{nextAppointment.notes}</div>
            )}
          </div>
        </section>
      )}

      {/* All Appointments List */}
      <section className="appointments-list">
        <h3>Today's Schedule</h3>
        {appointments.map((appointment, index) => (
          <div
            key={appointment.id || index}
            className={`appointment-item ${index === 0 ? 'current' : ''}`}
          >
            <div className="appointment-time-badge">
              <div
                className="time-icon"
                style={{
                  color: getTypeColor(appointment.type),
                  backgroundColor: `${getTypeColor(appointment.type)}20`
                }}
              >
                {getTypeIcon(appointment.type)}
              </div>
              <div className="appointment-time">{formatTime(appointment.time)}</div>
            </div>

            <div className="appointment-content">
              <div className="appointment-title">{appointment.title}</div>
              {appointment.location && (
                <div className="appointment-location">
                  <span className="location-icon">📍</span>
                  {appointment.location}
                </div>
              )}
              {appointment.notes && (
                <div className="appointment-notes">{appointment.notes}</div>
              )}
            </div>
          </div>
        ))}

        {appointments.length === 0 && (
          <div className="no-appointments">
            <span className="empty-icon">📅</span>
            <p>No appointments scheduled for today</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default MobileSchedule