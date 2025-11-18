import React, { useState, useEffect } from 'react'
import './FitnessDetailsModal.css'

function FitnessDetailsModal({ isOpen, onClose }) {
  const [currentView, setCurrentView] = useState('overview')
  const [fitnessData, setFitnessData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [timeframe, setTimeframe] = useState('week')

  const views = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'progress', label: 'Progress', icon: '📈' },
    { id: 'goals', label: 'Goals', icon: '🎯' },
    { id: 'history', label: 'History', icon: '📅' },
    { id: 'analytics', label: 'Analytics', icon: '🔍' }
  ]

  useEffect(() => {
    if (isOpen) {
      loadFitnessAnalytics()
    }
  }, [isOpen, timeframe])

  const loadFitnessAnalytics = async () => {
    setLoading(true)
    try {
      // Load extended fitness data
      const response = await fetch('/src/data/fitness-extended.json')
      const data = await response.json()
      setFitnessData(data)
    } catch (error) {
      console.error('Failed to load fitness analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateProgressPercentage = (current, target) => {
    return Math.min((current / target) * 100, 100)
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return '#4CAF50'
    if (percentage >= 70) return '#8BC34A'
    if (percentage >= 50) return '#FF9800'
    if (percentage >= 30) return '#FF5722'
    return '#F44336'
  }

  const renderProgressRing = (percentage, size = 120) => {
    const radius = (size - 10) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <div className="progress-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getProgressColor(percentage)}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="progress-text">
          <span className="progress-percentage">{Math.round(percentage)}%</span>
        </div>
      </div>
    )
  }

  if (!isOpen || !fitnessData) return null

  const { goals, currentStats, lastWorkout, workoutHistory, analytics, achievements, trends } = fitnessData

  return (
    <div className="modal-overlay fitness-details-overlay">
      <div className="fitness-details-modal">
        <div className="modal-header">
          <h2>📊 Fitness Analytics</h2>
          <div className="timeframe-selector">
            {['week', 'month', 'quarter'].map(period => (
              <button
                key={period}
                className={`timeframe-btn ${timeframe === period ? 'active' : ''}`}
                onClick={() => setTimeframe(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <div className="view-navigation">
            {views.map(view => (
              <button
                key={view.id}
                className={`view-tab ${currentView === view.id ? 'active' : ''}`}
                onClick={() => setCurrentView(view.id)}
              >
                <span className="view-icon">{view.icon}</span>
                <span className="view-label">{view.label}</span>
              </button>
            ))}
          </div>

          <div className="view-content">
            {currentView === 'overview' && (
              <div className="overview-view">
                <div className="stats-grid">
                  {/* Last Workout */}
                  <div className="stat-card last-workout-card">
                    <h3>🏋️ Last Workout</h3>
                    {lastWorkout ? (
                      <div className="last-workout-content">
                        <div className="workout-summary">
                          <div className="workout-type">{lastWorkout.type}</div>
                          <div className="workout-date">{lastWorkout.date}</div>
                          <div className="workout-stats">
                            <span>{lastWorkout.duration} min</span>
                            <span>{lastWorkout.caloriesBurned} cal</span>
                          </div>
                        </div>
                        <div className="workout-rating">
                          <span>Rating: </span>
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`star ${i < lastWorkout.rating ? 'filled' : ''}`}>
                              ★
                            </span>
                          ))}
                        </div>
                        <div className="exercise-count">
                          {lastWorkout.exercises.length} exercises completed
                        </div>
                        {lastWorkout.notes && (
                          <div className="workout-notes">"{lastWorkout.notes}"</div>
                        )}
                        <button className="repeat-workout-btn">
                          🔁 Repeat Workout
                        </button>
                      </div>
                    ) : (
                      <div className="no-workout">
                        <p>No recent workouts</p>
                        <button className="start-workout-btn">Start First Workout</button>
                      </div>
                    )}
                  </div>

                  {/* Weekly Progress */}
                  <div className="stat-card">
                    <h3>📅 This Week</h3>
                    <div className="weekly-progress">
                      <div className="progress-item">
                        <span className="progress-label">Workouts</span>
                        {renderProgressRing(
                          calculateProgressPercentage(currentStats.weekly.workoutsCompleted, goals.weekly.workouts),
                          100
                        )}
                        <span className="progress-values">
                          {currentStats.weekly.workoutsCompleted}/{goals.weekly.workouts}
                        </span>
                      </div>
                      <div className="progress-item">
                        <span className="progress-label">Minutes</span>
                        {renderProgressRing(
                          calculateProgressPercentage(currentStats.weekly.totalMinutes, goals.weekly.totalMinutes),
                          100
                        )}
                        <span className="progress-values">
                          {currentStats.weekly.totalMinutes}/{goals.weekly.totalMinutes}
                        </span>
                      </div>
                      <div className="progress-item">
                        <span className="progress-label">Calories</span>
                        {renderProgressRing(
                          calculateProgressPercentage(currentStats.weekly.totalCalories, goals.weekly.totalCalories),
                          100
                        )}
                        <span className="progress-values">
                          {currentStats.weekly.totalCalories}/{goals.weekly.totalCalories}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Summary */}
                  <div className="stat-card">
                    <h3>📈 This Month</h3>
                    <div className="monthly-stats">
                      <div className="month-stat">
                        <span className="stat-number">{currentStats.monthly.workoutsCompleted}</span>
                        <span className="stat-label">Workouts</span>
                      </div>
                      <div className="month-stat">
                        <span className="stat-number">{Math.floor(currentStats.monthly.totalMinutes / 60)}h</span>
                        <span className="stat-label">Total Time</span>
                      </div>
                      <div className="month-stat">
                        <span className="stat-number">{(currentStats.monthly.totalCalories / 1000).toFixed(1)}k</span>
                        <span className="stat-label">Calories</span>
                      </div>
                      <div className="month-stat">
                        <span className="stat-number">{currentStats.monthly.consistencyStreak}</span>
                        <span className="stat-label">Day Streak</span>
                      </div>
                    </div>
                  </div>

                  {/* Achievements */}
                  <div className="stat-card">
                    <h3>🏆 Achievements</h3>
                    <div className="achievements-list">
                      {achievements.map(achievement => (
                        <div
                          key={achievement.id}
                          className={`achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                        >
                          <div className="achievement-icon">
                            {achievement.unlocked ? '🏆' : '🔒'}
                          </div>
                          <div className="achievement-info">
                            <div className="achievement-title">{achievement.title}</div>
                            <div className="achievement-desc">{achievement.description}</div>
                            {!achievement.unlocked && achievement.progress && (
                              <div className="achievement-progress">
                                <div className="progress-bar">
                                  <div
                                    className="progress-fill"
                                    style={{ width: `${achievement.progress}%` }}
                                  ></div>
                                </div>
                                <span className="progress-text">{achievement.progress}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'progress' && (
              <div className="progress-view">
                <div className="progress-charts">
                  {/* Weekly Progress Chart */}
                  <div className="chart-card">
                    <h3>📊 Weekly Progress</h3>
                    <div className="bar-chart">
                      {analytics.weeklyProgress.map((week, index) => (
                        <div key={index} className="bar-group">
                          <div className="bar-container">
                            <div
                              className="bar workouts-bar"
                              style={{ height: `${(week.workouts / 6) * 100}%` }}
                              title={`${week.workouts} workouts`}
                            ></div>
                            <div
                              className="bar calories-bar"
                              style={{ height: `${(week.calories / 2000) * 100}%` }}
                              title={`${week.calories} calories`}
                            ></div>
                            <div
                              className="bar minutes-bar"
                              style={{ height: `${(week.minutes / 300) * 100}%` }}
                              title={`${week.minutes} minutes`}
                            ></div>
                          </div>
                          <div className="bar-label">{week.week}</div>
                        </div>
                      ))}
                    </div>
                    <div className="chart-legend">
                      <div className="legend-item">
                        <div className="legend-color workouts-color"></div>
                        <span>Workouts</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color calories-color"></div>
                        <span>Calories</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color minutes-color"></div>
                        <span>Minutes</span>
                      </div>
                    </div>
                  </div>

                  {/* Exercise Type Breakdown */}
                  <div className="chart-card">
                    <h3>🎯 Workout Type Distribution</h3>
                    <div className="pie-chart-container">
                      <div className="pie-chart">
                        {analytics.exerciseTypeBreakdown.map((type, index) => {
                          const colors = ['#6A5ACD', '#8A7BD8', '#B8A9E8', '#E6DBF7']
                          return (
                            <div
                              key={index}
                              className="pie-slice"
                              style={{
                                background: `conic-gradient(${colors[index]} 0deg ${type.percentage * 3.6}deg, transparent 0deg)`
                              }}
                            ></div>
                          )
                        })}
                      </div>
                      <div className="pie-legend">
                        {analytics.exerciseTypeBreakdown.map((type, index) => {
                          const colors = ['#6A5ACD', '#8A7BD8', '#B8A9E8', '#E6DBF7']
                          return (
                            <div key={index} className="pie-legend-item">
                              <div
                                className="pie-legend-color"
                                style={{ backgroundColor: colors[index] }}
                              ></div>
                              <span>{type.type}: {type.percentage}% ({type.sessions})</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'goals' && (
              <div className="goals-view">
                <div className="goals-grid">
                  {/* Daily Goals */}
                  <div className="goals-section">
                    <h3>🌅 Daily Goals</h3>
                    <div className="goal-items">
                      <div className="goal-item">
                        <div className="goal-header">
                          <span className="goal-name">Calories Burned</span>
                          <span className="goal-value">{currentStats.daily.caloriesBurned}/{goals.daily.caloriesBurn}</span>
                        </div>
                        <div className="goal-progress-bar">
                          <div
                            className="goal-progress-fill"
                            style={{
                              width: `${calculateProgressPercentage(currentStats.daily.caloriesBurned, goals.daily.caloriesBurn)}%`,
                              backgroundColor: getProgressColor(calculateProgressPercentage(currentStats.daily.caloriesBurned, goals.daily.caloriesBurn))
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="goal-item">
                        <div className="goal-header">
                          <span className="goal-name">Workout Duration</span>
                          <span className="goal-value">{currentStats.daily.workoutDuration}/{goals.daily.workoutDuration} min</span>
                        </div>
                        <div className="goal-progress-bar">
                          <div
                            className="goal-progress-fill"
                            style={{
                              width: `${calculateProgressPercentage(currentStats.daily.workoutDuration, goals.daily.workoutDuration)}%`,
                              backgroundColor: getProgressColor(calculateProgressPercentage(currentStats.daily.workoutDuration, goals.daily.workoutDuration))
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="goal-item">
                        <div className="goal-header">
                          <span className="goal-name">Daily Steps</span>
                          <span className="goal-value">{currentStats.daily.steps.toLocaleString()}/{goals.daily.steps.toLocaleString()}</span>
                        </div>
                        <div className="goal-progress-bar">
                          <div
                            className="goal-progress-fill"
                            style={{
                              width: `${calculateProgressPercentage(currentStats.daily.steps, goals.daily.steps)}%`,
                              backgroundColor: getProgressColor(calculateProgressPercentage(currentStats.daily.steps, goals.daily.steps))
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Goals */}
                  <div className="goals-section">
                    <h3>📅 Weekly Goals</h3>
                    <div className="goal-items">
                      <div className="goal-item">
                        <div className="goal-header">
                          <span className="goal-name">Total Workouts</span>
                          <span className="goal-value">{currentStats.weekly.workoutsCompleted}/{goals.weekly.workouts}</span>
                        </div>
                        <div className="goal-progress-bar">
                          <div
                            className="goal-progress-fill"
                            style={{
                              width: `${calculateProgressPercentage(currentStats.weekly.workoutsCompleted, goals.weekly.workouts)}%`,
                              backgroundColor: getProgressColor(calculateProgressPercentage(currentStats.weekly.workoutsCompleted, goals.weekly.workouts))
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="goal-item">
                        <div className="goal-header">
                          <span className="goal-name">Strength Sessions</span>
                          <span className="goal-value">{currentStats.weekly.strengthSessions}/{goals.weekly.strengthSessions}</span>
                        </div>
                        <div className="goal-progress-bar">
                          <div
                            className="goal-progress-fill"
                            style={{
                              width: `${calculateProgressPercentage(currentStats.weekly.strengthSessions, goals.weekly.strengthSessions)}%`,
                              backgroundColor: getProgressColor(calculateProgressPercentage(currentStats.weekly.strengthSessions, goals.weekly.strengthSessions))
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="goal-item">
                        <div className="goal-header">
                          <span className="goal-name">Cardio Sessions</span>
                          <span className="goal-value">{currentStats.weekly.cardioSessions}/{goals.weekly.cardioSessions}</span>
                        </div>
                        <div className="goal-progress-bar">
                          <div
                            className="goal-progress-fill"
                            style={{
                              width: `${calculateProgressPercentage(currentStats.weekly.cardioSessions, goals.weekly.cardioSessions)}%`,
                              backgroundColor: getProgressColor(calculateProgressPercentage(currentStats.weekly.cardioSessions, goals.weekly.cardioSessions))
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Goals */}
                  <div className="goals-section">
                    <h3>📊 Monthly Goals</h3>
                    <div className="goal-items">
                      <div className="goal-item">
                        <div className="goal-header">
                          <span className="goal-name">Total Workouts</span>
                          <span className="goal-value">{currentStats.monthly.workoutsCompleted}/{goals.monthly.workouts}</span>
                        </div>
                        <div className="goal-progress-bar">
                          <div
                            className="goal-progress-fill"
                            style={{
                              width: `${calculateProgressPercentage(currentStats.monthly.workoutsCompleted, goals.monthly.workouts)}%`,
                              backgroundColor: getProgressColor(calculateProgressPercentage(currentStats.monthly.workoutsCompleted, goals.monthly.workouts))
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="goal-item">
                        <div className="goal-header">
                          <span className="goal-name">Weight Loss Goal</span>
                          <span className="goal-value">1.5/{goals.monthly.weightLossGoal} lbs</span>
                        </div>
                        <div className="goal-progress-bar">
                          <div
                            className="goal-progress-fill"
                            style={{
                              width: `${calculateProgressPercentage(1.5, goals.monthly.weightLossGoal)}%`,
                              backgroundColor: getProgressColor(calculateProgressPercentage(1.5, goals.monthly.weightLossGoal))
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'history' && (
              <div className="history-view">
                <div className="workout-timeline">
                  <h3>📅 Workout History</h3>
                  <div className="timeline-container">
                    {workoutHistory.map((workout, index) => (
                      <div key={index} className="timeline-item">
                        <div className="timeline-date">{workout.date}</div>
                        <div className="timeline-content">
                          <div className="workout-summary">
                            <div className="workout-title">{workout.type}</div>
                            <div className="workout-metrics">
                              <span className="metric">{workout.duration} min</span>
                              <span className="metric">{workout.caloriesBurned} cal</span>
                              <span className="metric">{workout.exercises} exercises</span>
                            </div>
                            <div className="workout-rating">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className={`star ${i < workout.rating ? 'filled' : ''}`}>
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentView === 'analytics' && (
              <div className="analytics-view">
                <div className="analytics-grid">
                  {/* Trends */}
                  <div className="analytics-card">
                    <h3>📈 Fitness Trends</h3>
                    <div className="trends-content">
                      <div className="trend-item">
                        <div className="trend-label">Last 7 Days</div>
                        <div className="trend-value">{trends.last7Days.avgDuration} min avg</div>
                        <div className="trend-indicator positive">
                          ↗️ {trends.last7Days.improvementTrend}
                        </div>
                      </div>
                      <div className="trend-item">
                        <div className="trend-label">Consistency Rate</div>
                        <div className="trend-value">{trends.last7Days.consistencyRate}%</div>
                        <div className="trend-indicator positive">
                          📈 Excellent
                        </div>
                      </div>
                      <div className="trend-item">
                        <div className="trend-label">Avg Calories/Day</div>
                        <div className="trend-value">{trends.last7Days.avgCalories}</div>
                        <div className="trend-indicator positive">
                          🔥 On track
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal Records */}
                  <div className="analytics-card">
                    <h3>🏆 Personal Records</h3>
                    <div className="records-content">
                      <div className="record-item">
                        <span className="record-label">Longest Workout</span>
                        <span className="record-value">85 minutes</span>
                      </div>
                      <div className="record-item">
                        <span className="record-label">Most Calories/Day</span>
                        <span className="record-value">520 cal</span>
                      </div>
                      <div className="record-item">
                        <span className="record-label">Best Streak</span>
                        <span className="record-value">14 days</span>
                      </div>
                      <div className="record-item">
                        <span className="record-label">Total Workouts</span>
                        <span className="record-value">127 sessions</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FitnessDetailsModal