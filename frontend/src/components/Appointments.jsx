import React from 'react'
import appointmentsData from '../data/appointments.json'
import './Appointments.css'

function Appointments() {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'medical':
        return '🏥'
      case 'medication':
        return '💊'
      case 'therapy':
        return '🏃'
      case 'personal':
        return '📞'
      default:
        return '📅'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'medical':
        return 'type-medical'
      case 'medication':
        return 'type-medication'
      case 'therapy':
        return 'type-therapy'
      case 'personal':
        return 'type-personal'
      default:
        return 'type-default'
    }
  }

  return (
    <div className="appointments-widget">
      <div className="widget-header">
        <h2 className="widget-title">Today's Schedule</h2>
        <span className="appointment-count">{appointmentsData.length} events</span>
      </div>

      <div className="appointments-list">
        {appointmentsData.map((appointment) => (
          <div key={appointment.id} className={`appointment-item ${getTypeColor(appointment.type)}`}>
            <div className="appointment-icon">{getTypeIcon(appointment.type)}</div>
            <div className="appointment-details">
              <div className="appointment-time">{appointment.time}</div>
              <div className="appointment-title">{appointment.title}</div>
              <div className="appointment-location">{appointment.location}</div>
              {appointment.notes && (
                <div className="appointment-notes">{appointment.notes}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Appointments
