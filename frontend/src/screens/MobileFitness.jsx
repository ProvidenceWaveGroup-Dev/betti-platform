import { useState, useEffect } from 'react'
import '../styles/mobileFitness.scss'

const MobileFitness = ({ onNavigate }) => {
  const [fitnessData, setFitnessData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [todayStats, setTodayStats] = useState({ workouts: 0, calories: 0, minutes: 0 })
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState('exercises')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [customDuration, setCustomDuration] = useState(30)
  const [showDurationPicker, setShowDurationPicker] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)

  const exercises = [
    { name: 'Push-ups', category: 'Strength Training', calories_per_minute: 8 },
    { name: 'Squats', category: 'Strength Training', calories_per_minute: 7 },
    { name: 'Burpees', category: 'HIIT', calories_per_minute: 12 },
    { name: 'Jumping Jacks', category: 'Cardio', calories_per_minute: 9 },
    { name: 'Plank', category: 'Strength Training', calories_per_minute: 4 },
    { name: 'Lunges', category: 'Strength Training', calories_per_minute: 6 },
    { name: 'Mountain Climbers', category: 'HIIT', calories_per_minute: 10 },
    { name: 'Running in Place', category: 'Cardio', calories_per_minute: 11 },
    { name: 'Sit-ups', category: 'Strength Training', calories_per_minute: 5 },
    { name: 'High Knees', category: 'Cardio', calories_per_minute: 8 }
  ]

  const workoutVideos = {
    'strength': [
      { id: 'oqBk1E6IcMM', title: '20 MIN Full Body Workout - Dig Deeper', channel: 'MadFit', duration: '20:11', category: 'Strength Training' },
      { id: 'ml6cT4AZdqI', title: '15 MIN HIIT CARDIO WORKOUT', channel: 'MadFit', duration: '15:32', category: 'Strength Training' }
    ],
    'hiit': [
      { id: 'ml6cT4AZdqI', title: '15 MIN HIIT CARDIO WORKOUT', channel: 'MadFit', duration: '15:32', category: 'HIIT' },
      { id: 'TQZ5UA8r04s', title: '10 MIN AB WORKOUT', channel: 'Chloe Ting', duration: '10:35', category: 'HIIT' }
    ],
    'yoga': [
      { id: 'v7AYKMP6rOE', title: 'Yoga For Complete Beginners', channel: 'Yoga With Adriene', duration: '20:21', category: 'Yoga' }
    ],
    'cardio': [
      { id: 'ml6cT4AZdqI', title: '15 MIN HIIT CARDIO', channel: 'MadFit', duration: '15:32', category: 'Cardio' }
    ]
  }

  const allVideos = Object.values(workoutVideos).flat()

  useEffect(() => {
    loadFitnessData()
  }, [])

  const loadFitnessData = async () => {
    try {
      setLoading(true)

      // Load from localStorage first
      const storedStats = localStorage.getItem('daily_fitness_stats')
      const today = new Date().toISOString().split('T')[0]

      if (storedStats) {
        const stats = JSON.parse(storedStats)
        if (stats.date === today) {
          setTodayStats({
            workouts: stats.workouts || 0,
            calories: stats.calories || 0,
            minutes: stats.minutes || 0
          })
          setRecentWorkouts(stats.recentWorkouts || [])

          // Also set fallback data for display
          setFitnessData({
            dailySummary: {
              workoutCompleted: stats.workouts > 0,
              totalDuration: stats.minutes,
              caloriesBurned: stats.calories
            }
          })
          return
        }
      }

      // Load initial data from JSON file
      const response = await fetch('/src/data/fitness.json')
      const data = await response.json()

      const initialStats = {
        date: today,
        workouts: 0,
        calories: 0,
        minutes: 0,
        recentWorkouts: data.recentWorkouts?.slice(0, 3) || []
      }

      localStorage.setItem('daily_fitness_stats', JSON.stringify(initialStats))

      setTodayStats({
        workouts: initialStats.workouts,
        calories: initialStats.calories,
        minutes: initialStats.minutes
      })
      setRecentWorkouts(initialStats.recentWorkouts)
      setFitnessData(data)

    } catch (error) {
      console.error('Error loading fitness data:', error)
      // Set fallback data
      setFitnessData({
        dailySummary: {
          workoutCompleted: false,
          totalDuration: 0,
          caloriesBurned: 0
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const updateDailyStats = (workoutData) => {
    const today = new Date().toISOString().split('T')[0]
    const storedStats = localStorage.getItem('daily_fitness_stats')
    let stats = storedStats ? JSON.parse(storedStats) : { date: today, workouts: 0, calories: 0, minutes: 0, recentWorkouts: [] }

    if (stats.date !== today) {
      stats = { date: today, workouts: 0, calories: 0, minutes: 0, recentWorkouts: [] }
    }

    stats.workouts += 1
    stats.calories += workoutData.caloriesBurned
    stats.minutes += workoutData.duration

    const newWorkout = {
      type: workoutData.type,
      duration: workoutData.duration,
      caloriesBurned: workoutData.caloriesBurned,
      timestamp: new Date().toISOString()
    }
    stats.recentWorkouts = [newWorkout, ...stats.recentWorkouts.slice(0, 2)]

    localStorage.setItem('daily_fitness_stats', JSON.stringify(stats))

    setTodayStats({
      workouts: stats.workouts,
      calories: stats.calories,
      minutes: stats.minutes
    })
    setRecentWorkouts(stats.recentWorkouts)
  }

  const handleSearch = (query) => {
    setSearchQuery(query)

    if (query.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    try {
      if (searchMode === 'exercises') {
        const normalizedQuery = query.toLowerCase()
        const filteredExercises = exercises.filter(exercise =>
          exercise.name.toLowerCase().includes(normalizedQuery) ||
          exercise.category.toLowerCase().includes(normalizedQuery)
        )
        setSearchResults(filteredExercises)
      } else {
        const normalizedQuery = query.toLowerCase()
        let results = allVideos.filter(video =>
          video.title.toLowerCase().includes(normalizedQuery) ||
          video.channel.toLowerCase().includes(normalizedQuery) ||
          video.category.toLowerCase().includes(normalizedQuery)
        )
        setSearchResults(results.slice(0, 6))
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleExerciseSelect = (exercise) => {
    setSelectedExercise(exercise)
    setShowDurationPicker(true)
  }

  const logQuickWorkout = (exercise, duration = customDuration) => {
    try {
      const workoutData = {
        type: exercise.category,
        exercise: exercise.name,
        duration: duration,
        caloriesBurned: exercise.calories_per_minute * duration,
        timestamp: new Date().toISOString()
      }

      updateDailyStats(workoutData)

      setSearchQuery('')
      setSearchResults([])
      setSelectedExercise(null)
      setShowDurationPicker(false)

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }

      alert(`Workout logged: ${exercise.name} for ${duration} minutes!`)

    } catch (error) {
      console.error('Failed to log workout:', error)
    }
  }

  const logVideoWorkout = (video) => {
    try {
      const durationMinutes = parseInt(video.duration.split(':')[0]) || 30
      const estimatedCalories = durationMinutes * 8

      const workoutData = {
        type: video.category,
        exercise: video.title,
        duration: durationMinutes,
        caloriesBurned: estimatedCalories,
        timestamp: new Date().toISOString()
      }

      updateDailyStats(workoutData)

      setSearchQuery('')
      setSearchResults([])

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }

      // Open video player modal
      setSelectedVideo(video)
      setShowVideoModal(true)

    } catch (error) {
      console.error('Failed to log video workout:', error)
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'strength': return '💪'
      case 'hiit': return '⚡'
      case 'yoga': return '🧘'
      case 'cardio': return '🏃'
      default: return '💪'
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="mobile-fitness">
        <h2>Fitness Tracker</h2>
        <div className="loading-state">
          <span>Loading fitness data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-fitness">
      <h2>Fitness Tracker</h2>

      {/* Daily Stats Overview */}
      <section className="fitness-overview">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-icon">💪</div>
            <div className="stat-content">
              <div className="stat-value">{todayStats.workouts}</div>
              <div className="stat-label">Workouts</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <div className="stat-value">{todayStats.calories}</div>
              <div className="stat-label">Calories</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-value">{todayStats.minutes}</div>
              <div className="stat-label">Minutes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="search-section">
        <h3>Log Workout</h3>

        <div className="search-mode-tabs">
          <button
            className={`mode-tab ${searchMode === 'exercises' ? 'active' : ''}`}
            onClick={() => {
              setSearchMode('exercises')
              setSearchQuery('')
              setSearchResults([])
            }}
          >
            💪 Exercises
          </button>
          <button
            className={`mode-tab ${searchMode === 'videos' ? 'active' : ''}`}
            onClick={() => {
              setSearchMode('videos')
              setSearchQuery('')
              setSearchResults([])
            }}
          >
            🎬 Videos
          </button>
        </div>

        <input
          type="text"
          placeholder={searchMode === 'exercises' ? "Search exercises..." : "Search workout videos..."}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />

        {isSearching && (
          <div className="search-loading">Searching...</div>
        )}

        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((result, index) => (
              <div key={index} className="search-result-item">
                {searchMode === 'exercises' ? (
                  <button
                    className="exercise-result"
                    onClick={() => handleExerciseSelect(result)}
                  >
                    <div className="exercise-info">
                      <div className="exercise-name">{result.name}</div>
                      <div className="exercise-details">{result.category} • {result.calories_per_minute} cal/min</div>
                    </div>
                    <div className="exercise-action">+</div>
                  </button>
                ) : (
                  <button
                    className="video-result"
                    onClick={() => logVideoWorkout(result)}
                  >
                    <div className="video-info">
                      <div className="video-title">{result.title}</div>
                      <div className="video-details">{result.channel} • {result.duration}</div>
                    </div>
                    <div className="video-action">▶️</div>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {searchQuery.length === 0 && searchMode === 'videos' && (
          <div className="category-shortcuts">
            <div className="category-label">Quick Categories</div>
            <div className="category-buttons">
              {['strength', 'hiit', 'yoga', 'cardio'].map((category) => (
                <button
                  key={category}
                  className="category-btn"
                  onClick={() => handleSearch(category)}
                >
                  <span className="category-icon">{getCategoryIcon(category)}</span>
                  <span className="category-name">{category.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Today's Workouts */}
      {recentWorkouts.length > 0 && (
        <section className="todays-workouts">
          <h3>Today's Workouts</h3>
          <div className="workouts-list">
            {recentWorkouts.map((workout, index) => (
              <div key={index} className="workout-item">
                <div className="workout-icon">
                  {workout.type === 'Strength Training' && '💪'}
                  {workout.type === 'Cardio' && '🏃'}
                  {workout.type === 'HIIT' && '⚡'}
                  {workout.type === 'Yoga' && '🧘'}
                  {!['Strength Training', 'Cardio', 'HIIT', 'Yoga'].includes(workout.type) && '💪'}
                </div>
                <div className="workout-content">
                  <div className="workout-header">
                    <div className="workout-type">{workout.type}</div>
                    <div className="workout-time">{formatTime(workout.timestamp)}</div>
                  </div>
                  <div className="workout-stats">
                    {workout.duration}min • {workout.caloriesBurned} calories
                  </div>
                </div>
                <div className="workout-status">✓</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {searchQuery.length === 0 && recentWorkouts.length === 0 && (
        <section className="no-workouts">
          <div className="no-workouts-content">
            <div className="no-workouts-icon">💪</div>
            <div className="no-workouts-text">No workouts logged today</div>
            <div className="no-workouts-hint">Search exercises or videos to get started!</div>
          </div>
        </section>
      )}

      {/* Duration Picker Modal */}
      {showDurationPicker && selectedExercise && (
        <div className="modal-overlay">
          <div className="duration-modal">
            <h3>Log {selectedExercise.name}</h3>
            <p>How many minutes did you exercise?</p>

            <div className="duration-buttons">
              {[5, 10, 15, 20, 30, 45, 60].map(minutes => (
                <button
                  key={minutes}
                  className={`duration-btn ${customDuration === minutes ? 'active' : ''}`}
                  onClick={() => setCustomDuration(minutes)}
                >
                  {minutes}m
                </button>
              ))}
            </div>

            <div className="custom-duration">
              <label>Custom:</label>
              <input
                type="number"
                min="1"
                max="180"
                value={customDuration}
                onChange={(e) => setCustomDuration(parseInt(e.target.value) || 1)}
                className="duration-input"
              />
              <span>minutes</span>
            </div>

            <div className="duration-preview">
              <p><strong>{selectedExercise.name}</strong> for <strong>{customDuration} minutes</strong></p>
              <p>Estimated calories: <strong>{selectedExercise.calories_per_minute * customDuration}</strong></p>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowDurationPicker(false)
                  setSelectedExercise(null)
                }}
              >
                Cancel
              </button>
              <button
                className="log-btn"
                onClick={() => logQuickWorkout(selectedExercise, customDuration)}
              >
                Log Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {showVideoModal && selectedVideo && (
        <div className="modal-overlay">
          <div className="video-player-modal">
            <div className="video-modal-header">
              <h3>{selectedVideo.title}</h3>
              <button
                className="close-video-btn"
                onClick={() => {
                  setShowVideoModal(false)
                  setSelectedVideo(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className="video-modal-content">
              <div className="video-player">
                <iframe
                  width="100%"
                  height="300"
                  src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </div>
              <div className="video-details">
                <div className="video-info">
                  <div className="video-meta">
                    <span className="video-channel">By {selectedVideo.channel}</span>
                    <span className="video-duration">{selectedVideo.duration}</span>
                    <span className="video-category">{selectedVideo.category}</span>
                  </div>
                  <div className="video-logged-message">
                    ✅ Workout logged successfully!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileFitness