import React, { useState, useEffect } from 'react'
import medicationsApi from '../services/medicationsApi'
import './Medication.css'
import '../styles/mobileMedication.scss'

function Medication({ isCollapsed = false, variant = 'desktop', onNavigate }) {
  const [todayMeds, setTodayMeds] = useState([])
  const [completedCount, setCompletedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isMobile = variant === 'mobile'

  useEffect(() => {
    loadMedicationData()
  }, [])

  const loadMedicationData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await medicationsApi.getTodayMedications()

      if (response.success && response.data) {
        const medications = response.data
        setTodayMeds(medications)
        const completed = medications.filter(med => med.taken).length
        setCompletedCount(completed)
        setTotalCount(medications.length)
      } else {
        // No medications configured - show empty state
        setTodayMeds([])
        setCompletedCount(0)
        setTotalCount(0)
      }
    } catch (err) {
      console.error('Failed to load medications:', err)
      setError('Failed to load medications')
      // Fall back to empty state
      setTodayMeds([])
      setCompletedCount(0)
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const toggleMedication = async (medId) => {
    // Mobile haptic feedback
    if (isMobile && navigator.vibrate) {
      navigator.vibrate(50)
    }

    // Find the medication
    const med = todayMeds.find(m => m.id === medId)
    if (!med) return

    // Optimistic update
    const updatedMeds = todayMeds.map(m =>
      m.id === medId ? { ...m, taken: !m.taken } : m
    )
    setTodayMeds(updatedMeds)
    const completed = updatedMeds.filter(m => m.taken).length
    setCompletedCount(completed)

    try {
      if (!med.taken) {
        // Mark as taken
        await medicationsApi.markTaken(med.id, med.scheduleId)
      }
      // If already taken, we leave it as is (no undo for now)
    } catch (err) {
      console.error('Failed to update medication:', err)
      // Revert on error
      loadMedicationData()
    }
  }

  const getCompletionPercentage = () => {
    return totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  }

  const getMedIcon = (type) => {
    switch (type) {
      case 'prescription': return '💊'
      case 'vitamin': return '🟡'
      case 'supplement': return '🟢'
      default: return '💊'
    }
  }

  const getMedTypeColor = (type) => {
    switch (type) {
      case 'prescription': return '#8b5cf6'
      case 'vitamin': return '#f59e0b'
      case 'supplement': return '#22c55e'
      default: return '#6b7280'
    }
  }

  const isOverdue = (time) => {
    const now = new Date()
    const [hour, minute] = time.split(':')
    const medTime = new Date()
    medTime.setHours(parseInt(hour), parseInt(minute), 0, 0)
    return now > medTime
  }

  const formatTime = (time) => {
    const [hour, minute] = time.split(':')
    const hour12 = parseInt(hour) > 12 ? parseInt(hour) - 12 : parseInt(hour)
    const ampm = parseInt(hour) >= 12 ? 'PM' : 'AM'
    return `${hour12 === 0 ? 12 : hour12}:${minute} ${ampm}`
  }

  const getNextMedication = () => {
    const upcomingMeds = todayMeds.filter(med => !med.taken)
    return upcomingMeds.length > 0 ? upcomingMeds[0] : null
  }

  // Collapsed desktop view
  if (isCollapsed && !isMobile) {
    return (
      <div className="medication-card collapsed">
        <div className="card-header">
          <h3 className="card-title">💊 Medication</h3>
          <div className="completion-badge">
            {completedCount}/{totalCount}
          </div>
        </div>
      </div>
    )
  }

  // Mobile layout
  if (isMobile) {
    const nextMed = getNextMedication()

    return (
      <div className="mobile-medication">
        <h2>Medication Tracker</h2>

        {/* Progress Overview */}
        <section className="medication-overview">
          <div className="progress-stats">
            <div className="completion-info">
              <span className="completion-text">{completedCount} of {totalCount} taken</span>
              <span className="completion-percentage">{getCompletionPercentage()}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${getCompletionPercentage()}%`,
                    backgroundColor: getCompletionPercentage() === 100 ? '#22c55e' : '#4a9eff'
                  }}
                ></div>
              </div>
            </div>
          </div>

          {completedCount === totalCount && totalCount > 0 && (
            <div className="completion-message">
              <span className="completion-icon">🎉</span>
              All medications taken today!
            </div>
          )}
        </section>

        {/* Next Medication Reminder */}
        {nextMed && (
          <section className="next-medication-card">
            <div className="next-med-header">
              <span className="next-med-label">Next Medication</span>
              <span className="next-med-time">{formatTime(nextMed.time)}</span>
            </div>
            <div className="next-med-details">
              <span
                className="next-med-icon"
                style={{ color: getMedTypeColor(nextMed.type) }}
              >
                {getMedIcon(nextMed.type)}
              </span>
              <div className="next-med-info">
                <div className="next-med-name">{nextMed.name}</div>
                <div className="next-med-type">{nextMed.type}</div>
              </div>
              <button
                className="quick-take-btn"
                onClick={() => toggleMedication(nextMed.id)}
              >
                Take Now
              </button>
            </div>
          </section>
        )}

        {/* Medication List */}
        <section className="medications-list">
          <h3>Today's Schedule</h3>
          {todayMeds.map((med) => (
            <div
              key={med.id}
              className={`medication-item ${med.taken ? 'completed' : ''} ${
                isOverdue(med.time) && !med.taken ? 'overdue' : ''
              }`}
            >
              <div className="med-time-badge">
                <div className="med-time">{formatTime(med.time)}</div>
              </div>

              <div className="med-content">
                <div className="med-header">
                  <span
                    className="med-icon"
                    style={{
                      color: getMedTypeColor(med.type),
                      backgroundColor: `${getMedTypeColor(med.type)}20`
                    }}
                  >
                    {getMedIcon(med.type)}
                  </span>
                  <div className="med-info">
                    <div className="med-name">{med.name}</div>
                    <div className="med-type">{med.type}</div>
                  </div>
                </div>

                {isOverdue(med.time) && !med.taken && (
                  <div className="overdue-warning">
                    Overdue
                  </div>
                )}
              </div>

              <button
                className={`med-toggle-btn ${med.taken ? 'taken' : 'pending'}`}
                onClick={() => toggleMedication(med.id)}
              >
                {med.taken ? '✓' : '○'}
              </button>
            </div>
          ))}
        </section>
      </div>
    )
  }

  // Desktop full layout
  return (
    <div className="medication-card">
      <div className="card-header">
        <h2 className="card-title">💊 Medication</h2>
        <div className="completion-stats">
          <span className="completion-text">{completedCount}/{totalCount} taken</span>
          <span className="completion-percentage">{getCompletionPercentage()}%</span>
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${getCompletionPercentage()}%`,
              backgroundColor: getCompletionPercentage() === 100 ? '#4CAF50' : '#4a9eff'
            }}
          ></div>
        </div>
      </div>

      <div className="medications-list">
        {todayMeds.map((med) => (
          <div
            key={med.id}
            className={`medication-item ${med.taken ? 'completed' : ''} ${isOverdue(med.time) && !med.taken ? 'overdue' : ''}`}
          >
            <div className="med-info">
              <span className="med-icon">{getMedIcon(med.type)}</span>
              <div className="med-details">
                <span className="med-name">{med.name}</span>
                <span className="med-time">{med.time}</span>
              </div>
            </div>
            <button
              className={`med-button ${med.taken ? 'taken' : 'pending'}`}
              onClick={() => toggleMedication(med.id)}
            >
              {med.taken ? '✓' : '○'}
            </button>
          </div>
        ))}
      </div>

      {completedCount === totalCount && totalCount > 0 && (
        <div className="completion-message">
          All medications taken today!
        </div>
      )}
    </div>
  )
}

export default Medication
