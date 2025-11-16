import React, { useState, useEffect } from 'react'
import './Vitals.css'

function Vitals({ isCollapsed = false }) {
  const [vitals, setVitals] = useState([])

  useEffect(() => {
    fetch('/src/data/vitals.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch vitals data')
        }
        return response.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setVitals(data)
        } else {
          console.error('Vitals data is not an array:', data)
          setVitals([])
        }
      })
      .catch(error => {
        console.error('Error loading vitals:', error)
        // Set fallback data
        setVitals([
          { icon: '❤️', label: 'Blood Pressure', value: '120/80', unit: 'mmHg', status: 'Normal', updated: '2 min ago' },
          { icon: '💓', label: 'Heart Rate', value: '72', unit: 'bpm', status: 'Normal', updated: '2 min ago' },
          { icon: '🫁', label: 'Oxygen Sat', value: '98', unit: '%', status: 'Normal', updated: '3 min ago' },
          { icon: '🌡️', label: 'Temperature', value: '98.6', unit: '°F', status: 'Normal', updated: '5 min ago' }
        ])
      })
  }, [])

  if (isCollapsed) {
    return (
      <div className="vitals-mini">
        <div className="mini-header">
          <span className="mini-icon">❤️</span>
          <span className="mini-title">Health Vitals</span>
          <span className="mini-status status-normal">● All Systems Normal</span>
        </div>
        <div className="mini-vitals-grid">
          {Array.isArray(vitals) && vitals.slice(0, 4).map((vital, index) => (
            <div key={index} className="mini-vital-item">
              <span className="mini-vital-icon">{vital.icon}</span>
              <div className="mini-vital-info">
                <span className="mini-vital-value">{vital.value}</span>
                <span className="mini-vital-label">{vital.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="vitals-card">
      <div className="card-header">
        <h2 className="card-title">Health Vitals</h2>
        <span className="status-indicator status-normal">
          <span className="status-dot"></span>
          All Systems Normal
        </span>
      </div>
      <div className="vitals-grid">
        {Array.isArray(vitals) && vitals.map((vital, index) => (
          <div key={index} className="vital-item">
            <div className="vital-icon-wrapper">
              <span className="vital-icon">{vital.icon}</span>
            </div>
            <div className="vital-content">
              <div className="vital-label">{vital.label}</div>
              <div className="vital-value">
                {vital.value}
                <span className="vital-unit">{vital.unit}</span>
              </div>
              <div className={`vital-status status-${vital.status.toLowerCase()}`}>
                {vital.status}
              </div>
              <div className="vital-updated">Updated {vital.updated}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Vitals
