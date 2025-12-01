import { useState, useEffect } from 'react'
import '../styles/mobileHealth.scss'

const MobileHealth = ({ onNavigate }) => {
  // Use the exact same data structure as desktop Vitals component
  const [vitalsData, setVitalsData] = useState([
    { icon: '❤️', label: 'BLOOD PRESSURE', value: '120/80', unit: 'mmHg', status: 'Normal', updated: '2 min ago' },
    { icon: '💓', label: 'HEART RATE', value: '72', unit: 'bpm', status: 'Normal', updated: '2 min ago' },
    { icon: '🫁', label: 'OXYGEN SAT', value: '98', unit: '%', status: 'Normal', updated: '3 min ago' },
    { icon: '🌡️', label: 'TEMPERATURE', value: '98.6', unit: '°F', status: 'Normal', updated: '5 min ago' }
  ])

  const [weightData] = useState({
    icon: '⚖️',
    label: 'WEIGHT',
    value: '165',
    unit: 'lbs',
    status: 'Stable',
    updated: '1 hour ago'
  })

  const getVitalStatus = (status) => {
    const statusMap = {
      'normal': { color: '#22c55e', class: 'normal' },
      'stable': { color: '#22c55e', class: 'stable' },
      'elevated': { color: '#f59e0b', class: 'warning' },
      'high': { color: '#ef4444', class: 'critical' },
      'low': { color: '#f59e0b', class: 'warning' }
    }
    return statusMap[status.toLowerCase()] || statusMap['normal']
  }

  return (
    <div className="mobile-health">
      <h2>Health Vitals</h2>

      {/* Status Header */}
      <section className="vitals-status-header">
        <div className="status-indicator">
          <span className="status-dot"></span>
          All Systems Normal
        </div>
      </section>

      {/* Current Vitals Cards */}
      <section className="vitals-grid">
        {vitalsData.map((vital, index) => {
          const statusInfo = getVitalStatus(vital.status)
          return (
            <div key={index} className={`vital-card ${statusInfo.class}`}>
              <div className="vital-icon">{vital.icon}</div>
              <div className="vital-info">
                <div className="vital-label">{vital.label}</div>
                <div className="vital-value">
                  {vital.value}
                  <span className="vital-unit">{vital.unit}</span>
                </div>
                <div className="vital-status" style={{ color: statusInfo.color }}>
                  {vital.status}
                </div>
                <div className="vital-time">Updated {vital.updated}</div>
              </div>
            </div>
          )
        })}
      </section>

      {/* Weight Section */}
      <section className="weight-section">
        <div className={`vital-card ${getVitalStatus(weightData.status).class}`}>
          <div className="vital-icon">{weightData.icon}</div>
          <div className="vital-info">
            <div className="vital-label">{weightData.label}</div>
            <div className="vital-value">
              {weightData.value}
              <span className="vital-unit">{weightData.unit}</span>
            </div>
            <div className="vital-status" style={{ color: getVitalStatus(weightData.status).color }}>
              {weightData.status}
            </div>
            <div className="vital-time">Updated {weightData.updated}</div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default MobileHealth