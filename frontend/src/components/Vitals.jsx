import React from 'react'
import vitalsData from '../data/vitals.json'
import './Vitals.css'

function Vitals() {
  const getStatusColor = (status) => {
    switch (status) {
      case 'normal':
        return 'status-normal'
      case 'warning':
        return 'status-warning'
      case 'critical':
        return 'status-critical'
      default:
        return 'status-normal'
    }
  }

  const formatLastUpdated = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="vitals-widget">
      <div className="widget-header">
        <h2 className="widget-title">Health Vitals</h2>
        <span className="vitals-status">
          <span className="status-dot"></span>
          All Systems Normal
        </span>
      </div>

      <div className="vitals-grid">
        <div className={`vital-card ${getStatusColor(vitalsData.bloodPressure.status)}`}>
          <div className="vital-icon">❤️</div>
          <div className="vital-info">
            <div className="vital-label">Blood Pressure</div>
            <div className="vital-value">
              {vitalsData.bloodPressure.systolic}/{vitalsData.bloodPressure.diastolic}
              <span className="vital-unit">{vitalsData.bloodPressure.unit}</span>
            </div>
            <div className="vital-status">{vitalsData.bloodPressure.status}</div>
            <div className="vital-time">
              Updated {formatLastUpdated(vitalsData.bloodPressure.lastUpdated)}
            </div>
          </div>
        </div>

        <div className={`vital-card ${getStatusColor(vitalsData.heartRate.status)}`}>
          <div className="vital-icon">💓</div>
          <div className="vital-info">
            <div className="vital-label">Heart Rate</div>
            <div className="vital-value">
              {vitalsData.heartRate.value}
              <span className="vital-unit">{vitalsData.heartRate.unit}</span>
            </div>
            <div className="vital-status">{vitalsData.heartRate.status}</div>
            <div className="vital-time">
              Updated {formatLastUpdated(vitalsData.heartRate.lastUpdated)}
            </div>
          </div>
        </div>

        <div className={`vital-card ${getStatusColor(vitalsData.oxygenSaturation.status)}`}>
          <div className="vital-icon">🫁</div>
          <div className="vital-info">
            <div className="vital-label">Oxygen Saturation</div>
            <div className="vital-value">
              {vitalsData.oxygenSaturation.value}
              <span className="vital-unit">{vitalsData.oxygenSaturation.unit}</span>
            </div>
            <div className="vital-status">{vitalsData.oxygenSaturation.status}</div>
            <div className="vital-time">
              Updated {formatLastUpdated(vitalsData.oxygenSaturation.lastUpdated)}
            </div>
          </div>
        </div>

        <div className={`vital-card ${getStatusColor(vitalsData.temperature.status)}`}>
          <div className="vital-icon">🌡️</div>
          <div className="vital-info">
            <div className="vital-label">Temperature</div>
            <div className="vital-value">
              {vitalsData.temperature.value}
              <span className="vital-unit">{vitalsData.temperature.unit}</span>
            </div>
            <div className="vital-status">{vitalsData.temperature.status}</div>
            <div className="vital-time">
              Updated {formatLastUpdated(vitalsData.temperature.lastUpdated)}
            </div>
          </div>
        </div>

        <div className={`vital-card ${getStatusColor(vitalsData.weight.status)}`}>
          <div className="vital-icon">⚖️</div>
          <div className="vital-info">
            <div className="vital-label">Weight</div>
            <div className="vital-value">
              {vitalsData.weight.value}
              <span className="vital-unit">{vitalsData.weight.unit}</span>
            </div>
            <div className="vital-status">{vitalsData.weight.status}</div>
            <div className="vital-time">
              Updated {formatLastUpdated(vitalsData.weight.lastUpdated)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Vitals
