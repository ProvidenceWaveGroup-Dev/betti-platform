import React, { useState, useEffect } from 'react'
import fitnessApi from '../services/fitnessApi'
import WorkoutInputModal from './WorkoutInputModal'
import FitnessDetailsModal from './FitnessDetailsModal'
import WorkoutVideoSearch from './WorkoutVideoSearch'
import './Fitness.css'

function Fitness({ isCollapsed = false }) {
  const [fitnessData, setFitnessData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showWorkoutModal, setShowWorkoutModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [extendedData, setExtendedData] = useState(null)

  useEffect(() => {
    loadFitnessData()
    loadExtendedData()
  }, [])

  const loadExtendedData = async () => {
    try {
      const response = await fetch('/src/data/fitness-extended.json')
      const data = await response.json()
      setExtendedData(data)
    } catch (error) {
      console.error('Failed to load extended fitness data:', error)
    }
  }

  const loadFitnessData = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await fitnessApi.getFitnessDashboardData()
      setFitnessData(data)
    } catch (error) {
      console.error('Error loading fitness data:', error)
      setError(error.message)

      // Set fallback data in case API fails
      setFitnessData({
        dailySummary: {
          workoutCompleted: false,
          totalDuration: 0,
          caloriesBurned: 0,
          goals: {
            weeklyWorkouts: { completed: 0, target: 5, percentage: 0 },
            weeklyMinutes: { completed: 0, target: 225, percentage: 0 },
            weeklyCalories: { completed: 0, target: 1600, percentage: 0 }
          }
        },
        recentExercises: [],
        workoutHistory: [],
        lastUpdated: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWorkoutLogged = () => {
    loadFitnessData()
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return '#4CAF50'
    if (percentage >= 60) return '#FF8800'
    return '#f44336'
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  if (loading) {
    return (
      <div className={`fitness-card ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading fitness data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`fitness-card ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="error-state">
          <p>❌ Error loading fitness data</p>
          <button onClick={loadFitnessData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { dailySummary, workoutHistory, recentExercises } = fitnessData
  const weeklyStats = dailySummary

  if (isCollapsed) {
    return (
      <div className="fitness-card collapsed">
        <div className="card-header">
          <h3 className="card-title">💪 Fitness</h3>
          <div className={`status-indicator ${dailySummary?.workoutCompleted ? 'completed' : 'pending'}`}>
            {dailySummary?.workoutCompleted ? '✅' : '⏱️'}
          </div>
        </div>
        <div className="mini-metrics">
          <div className="mini-metric">
            <span className="mini-value">{weeklyStats?.workoutsCompleted || 0}</span>
            <span className="mini-label">Workouts</span>
          </div>
          <div className="mini-metric">
            <span className="mini-value">{formatDuration(weeklyStats?.totalDuration || 0)}</span>
            <span className="mini-label">This Week</span>
          </div>
          <div className="mini-metric">
            <span className="mini-value">{weeklyStats?.totalCaloriesBurned || 0}</span>
            <span className="mini-label">Calories</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fitness-card">
      <div className="card-header">
        <h2 className="card-title">💪 Fitness</h2>
        <div className={`status-indicator ${dailySummary?.workoutCompleted ? 'completed' : 'pending'}`}>
          {dailySummary?.workoutCompleted ? 'Workout Complete' : 'No Workout Yet'}
        </div>
      </div>

      {/* Last Workout Summary */}
      {extendedData?.lastWorkout && (
        <div className="last-workout-section">
          <h3>🏋️ Last Workout</h3>
          <div className="last-workout-card">
            <div className="last-workout-header">
              <div className="workout-info">
                <div className="workout-type-large">{extendedData.lastWorkout.type}</div>
                <div className="workout-date">{extendedData.lastWorkout.date}</div>
              </div>
              <div className="workout-rating">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`star ${i < extendedData.lastWorkout.rating ? 'filled' : ''}`}>
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div className="workout-stats-grid">
              <div className="stat-mini">
                <span className="stat-value">{extendedData.lastWorkout.duration}</span>
                <span className="stat-label">Minutes</span>
              </div>
              <div className="stat-mini">
                <span className="stat-value">{extendedData.lastWorkout.caloriesBurned}</span>
                <span className="stat-label">Calories</span>
              </div>
              <div className="stat-mini">
                <span className="stat-value">{extendedData.lastWorkout.exercises.length}</span>
                <span className="stat-label">Exercises</span>
              </div>
            </div>
            {extendedData.lastWorkout.notes && (
              <div className="workout-notes-mini">
                "{extendedData.lastWorkout.notes}"
              </div>
            )}
            <button
              className="repeat-workout-button"
              onClick={() => {
                // TODO: Implement repeat workout functionality
                console.log('Repeating workout:', extendedData.lastWorkout)
              }}
            >
              🔁 Repeat This Workout
            </button>
          </div>
        </div>
      )}

      {/* Today's Summary */}
      <div className="fitness-summary">
        <div className="today-stats">
          <div className="stat-item">
            <span className="stat-value">{dailySummary?.totalDuration || 0}</span>
            <span className="stat-label">Minutes Today</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{dailySummary?.caloriesBurned || 0}</span>
            <span className="stat-label">Calories Burned</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{dailySummary?.todaysWorkout?.type || 'Rest Day'}</span>
            <span className="stat-label">Workout Type</span>
          </div>
        </div>
      </div>

      {/* Weekly Goals Progress */}
      <div className="goals-section">
        <h3>Weekly Goals</h3>
        <div className="goals-grid">
          <div className="goal-item">
            <div className="goal-header">
              <span className="goal-label">Workouts</span>
              <span className="goal-value">
                {dailySummary?.goals?.weeklyWorkouts?.completed || 0}/{dailySummary?.goals?.weeklyWorkouts?.target || 5}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(dailySummary?.goals?.weeklyWorkouts?.percentage || 0, 100)}%`,
                  backgroundColor: getProgressColor(dailySummary?.goals?.weeklyWorkouts?.percentage || 0)
                }}
              ></div>
            </div>
          </div>

          <div className="goal-item">
            <div className="goal-header">
              <span className="goal-label">Minutes</span>
              <span className="goal-value">
                {dailySummary?.goals?.weeklyMinutes?.completed || 0}/{dailySummary?.goals?.weeklyMinutes?.target || 225}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(dailySummary?.goals?.weeklyMinutes?.percentage || 0, 100)}%`,
                  backgroundColor: getProgressColor(dailySummary?.goals?.weeklyMinutes?.percentage || 0)
                }}
              ></div>
            </div>
          </div>

          <div className="goal-item">
            <div className="goal-header">
              <span className="goal-label">Calories</span>
              <span className="goal-value">
                {dailySummary?.goals?.weeklyCalories?.completed || 0}/{dailySummary?.goals?.weeklyCalories?.target || 1600}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(dailySummary?.goals?.weeklyCalories?.percentage || 0, 100)}%`,
                  backgroundColor: getProgressColor(dailySummary?.goals?.weeklyCalories?.percentage || 0)
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Workouts */}
      <div className="recent-workouts">
        <h3>Recent Workouts</h3>
        <div className="workouts-list">
          {workoutHistory?.slice(0, 3).map((workout, index) => (
            <div key={index} className="workout-item">
              <div className="workout-info">
                <span className="workout-type">{workout.type || workout.activity}</span>
                <span className="workout-date">{workout.date}</span>
              </div>
              <div className="workout-stats">
                <span className="workout-duration">{formatDuration(workout.duration)}</span>
                <span className="workout-calories">{workout.caloriesBurned} cal</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="log-workout-button"
          onClick={() => setShowWorkoutModal(true)}
        >
          📝 Log Workout
        </button>
        <button
          className="video-search-button"
          onClick={() => setShowVideoModal(true)}
        >
          🎬 Find Videos
        </button>
        <button
          className="view-details-button"
          onClick={() => setShowDetailsModal(true)}
        >
          📊 View Details
        </button>
      </div>

      {/* Modals */}
      <WorkoutInputModal
        isOpen={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        onWorkoutLogged={handleWorkoutLogged}
      />

      <FitnessDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />

      <WorkoutVideoSearch
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        workoutType={dailySummary?.todaysWorkout?.type || ''}
      />
    </div>
  )
}

export default Fitness