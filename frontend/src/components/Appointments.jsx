import React, { useState, useEffect } from 'react'
import './Appointments.css'

function Appointments({ isCollapsed = false }) {
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    fetch('/src/data/appointments.json')
      .then(response => response.json())
      .then(data => setAppointments(data))
      .catch(error => console.error('Error loading appointments:', error))
  }, [])

  const getNextAppointment = () => {
    if (appointments.length === 0) return null
    return appointments[0]
  }

  if (isCollapsed) {
    const next = getNextAppointment()
    return (
      <div className="appointments-mini">
        <div className="mini-header">
          <span className="mini-icon">📅</span>
          <span className="mini-title">Today's Schedule</span>
          <span className="mini-count">{appointments.length} events</span>
        </div>
        {next && (
          <div className="mini-content">
            <span className="mini-time">{next.time}</span>
            <span className="mini-text">{next.title}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="appointments-card">
      <div className="card-header">
        <h2 className="card-title">Today's Schedule</h2>
        <span className="event-count">{appointments.length} events</span>
      </div>
      <div className="appointments-list">
        {appointments.map((apt, index) => (
          <div key={index} className="appointment-item">
            <div className="appointment-time-badge">
              <div className="time-icon">{apt.icon}</div>
            </div>
            <div className="appointment-details">
              <div className="appointment-time">{apt.time}</div>
              <div className="appointment-title">{apt.title}</div>
              {apt.location && (
                <div className="appointment-location">
                  <span className="location-icon">📍</span>
                  {apt.location}
                </div>
              )}
              {apt.notes && (
                <div className="appointment-notes">{apt.notes}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Appointments
