import React, { useState, useEffect } from 'react'
import fitnessApi from '../services/fitnessApi'
import './WorkoutInputModal.css'

function WorkoutInputModal({ isOpen, onClose, onWorkoutLogged }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [workoutData, setWorkoutData] = useState({
    type: '',
    duration: '',
    exercises: [],
    caloriesBurned: 0,
    rating: 5,
    notes: ''
  })

  // Exercise search state
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [exerciseResults, setExerciseResults] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [exerciseDetails, setExerciseDetails] = useState({
    sets: 1,
    reps: [],
    weight: '',
    duration: ''
  })

  // Quick workout types
  const workoutTypes = [
    { type: 'Strength Training', icon: '💪', color: '#ff6b6b' },
    { type: 'Cardio', icon: '🏃', color: '#4ecdc4' },
    { type: 'HIIT', icon: '⚡', color: '#45b7d1' },
    { type: 'Yoga', icon: '🧘', color: '#96ceb4' },
    { type: 'Swimming', icon: '🏊', color: '#74b9ff' },
    { type: 'Cycling', icon: '🚴', color: '#fdcb6e' },
    { type: 'Running', icon: '🏃‍♀️', color: '#e17055' },
    { type: 'Custom', icon: '⭐', color: '#a29bfe' }
  ]

  useEffect(() => {
    if (exerciseSearch.length >= 2) {
      const timeoutId = setTimeout(async () => {
        try {
          const result = await fitnessApi.searchExercises(exerciseSearch, 8)
          setExerciseResults(result.data || [])
        } catch (error) {
          console.error('Failed to search exercises:', error)
          setExerciseResults([])
        }
      }, 300)

      return () => clearTimeout(timeoutId)
    } else {
      setExerciseResults([])
    }
  }, [exerciseSearch])

  const handleWorkoutTypeSelect = (type) => {
    setWorkoutData({ ...workoutData, type })
    setCurrentStep(2)
  }

  const handleExerciseSelect = (exercise) => {
    setSelectedExercise(exercise)
    setExerciseSearch(exercise.name)
    setExerciseResults([])
  }

  const handleAddExercise = () => {
    if (!selectedExercise) return

    const newExercise = {
      ...selectedExercise,
      sets: exerciseDetails.sets,
      reps: exerciseDetails.reps,
      weight: exerciseDetails.weight,
      duration: exerciseDetails.duration || 0,
      caloriesBurned: fitnessApi.calculateCaloriesBurned(selectedExercise, exerciseDetails.duration || 5)
    }

    setWorkoutData(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise],
      caloriesBurned: prev.caloriesBurned + newExercise.caloriesBurned
    }))

    // Reset exercise input
    setSelectedExercise(null)
    setExerciseSearch('')
    setExerciseDetails({ sets: 1, reps: [], weight: '', duration: '' })
  }

  const handleRemoveExercise = (index) => {
    const exerciseToRemove = workoutData.exercises[index]
    setWorkoutData(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
      caloriesBurned: Math.max(0, prev.caloriesBurned - exerciseToRemove.caloriesBurned)
    }))
  }

  const handleRepChange = (setIndex, value) => {
    const newReps = [...exerciseDetails.reps]
    newReps[setIndex] = parseInt(value) || 0
    setExerciseDetails({ ...exerciseDetails, reps: newReps })
  }

  const handleSubmitWorkout = async () => {
    try {
      const finalWorkoutData = {
        ...workoutData,
        date: new Date().toISOString().split('T')[0],
        totalDuration: parseInt(workoutData.duration),
        completed: true
      }

      await fitnessApi.logWorkout(finalWorkoutData)
      onWorkoutLogged && onWorkoutLogged()
      onClose()

      // Reset form
      setCurrentStep(1)
      setWorkoutData({
        type: '',
        duration: '',
        exercises: [],
        caloriesBurned: 0,
        rating: 5,
        notes: ''
      })
    } catch (error) {
      console.error('Failed to log workout:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay workout-modal-overlay">
      <div className="workout-modal">
        <div className="modal-header">
          <h2>Log Workout</h2>
          <div className="step-indicator">
            <span className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</span>
            <span className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</span>
            <span className={`step ${currentStep >= 3 ? 'active' : ''}`}>3</span>
          </div>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          {/* Step 1: Workout Type Selection */}
          {currentStep === 1 && (
            <div className="step-content">
              <h3>Select Workout Type</h3>
              <div className="workout-types-grid">
                {workoutTypes.map((workout, index) => (
                  <button
                    key={index}
                    className="workout-type-card"
                    onClick={() => handleWorkoutTypeSelect(workout.type)}
                    style={{ borderColor: workout.color }}
                  >
                    <span className="workout-icon">{workout.icon}</span>
                    <span className="workout-name">{workout.type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Exercise Selection */}
          {currentStep === 2 && (
            <div className="step-content">
              <h3>Add Exercises</h3>

              {/* Exercise Search */}
              <div className="exercise-search">
                <input
                  type="text"
                  placeholder="Search exercises..."
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  className="search-input"
                />

                {exerciseResults.length > 0 && (
                  <div className="search-results">
                    {exerciseResults.map((exercise, index) => (
                      <div
                        key={index}
                        className="exercise-result"
                        onClick={() => handleExerciseSelect(exercise)}
                      >
                        <div className="exercise-info">
                          <span className="exercise-name">{exercise.name}</span>
                          <span className="exercise-category">{exercise.category}</span>
                        </div>
                        <span className="exercise-calories">{exercise.calories_per_minute} cal/min</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Exercise Details Input */}
              {selectedExercise && (
                <div className="exercise-details">
                  <h4>Exercise Details: {selectedExercise.name}</h4>

                  {selectedExercise.type === 'Strength' ? (
                    <div className="strength-details">
                      <div className="input-group">
                        <label>Sets:</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={exerciseDetails.sets}
                          onChange={(e) => setExerciseDetails({
                            ...exerciseDetails,
                            sets: parseInt(e.target.value) || 1,
                            reps: new Array(parseInt(e.target.value) || 1).fill(0)
                          })}
                        />
                      </div>

                      <div className="reps-input">
                        <label>Reps per Set:</label>
                        {Array.from({ length: exerciseDetails.sets }).map((_, index) => (
                          <input
                            key={index}
                            type="number"
                            min="1"
                            placeholder={`Set ${index + 1}`}
                            value={exerciseDetails.reps[index] || ''}
                            onChange={(e) => handleRepChange(index, e.target.value)}
                            className="rep-input"
                          />
                        ))}
                      </div>

                      <div className="input-group">
                        <label>Weight:</label>
                        <input
                          type="text"
                          placeholder="e.g., 135 lbs"
                          value={exerciseDetails.weight}
                          onChange={(e) => setExerciseDetails({
                            ...exerciseDetails,
                            weight: e.target.value
                          })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="cardio-details">
                      <div className="input-group">
                        <label>Duration (minutes):</label>
                        <input
                          type="number"
                          min="1"
                          value={exerciseDetails.duration}
                          onChange={(e) => setExerciseDetails({
                            ...exerciseDetails,
                            duration: parseInt(e.target.value) || 0
                          })}
                        />
                      </div>
                    </div>
                  )}

                  <button className="add-exercise-btn" onClick={handleAddExercise}>
                    Add Exercise
                  </button>
                </div>
              )}

              {/* Added Exercises List */}
              {workoutData.exercises.length > 0 && (
                <div className="added-exercises">
                  <h4>Added Exercises ({workoutData.exercises.length})</h4>
                  {workoutData.exercises.map((exercise, index) => (
                    <div key={index} className="added-exercise">
                      <div className="exercise-summary">
                        <span className="name">{exercise.name}</span>
                        {exercise.sets && (
                          <span className="sets-reps">
                            {exercise.sets} sets × {exercise.reps.join(', ')} reps
                          </span>
                        )}
                        {exercise.duration > 0 && (
                          <span className="duration">{exercise.duration} min</span>
                        )}
                        <span className="calories">{exercise.caloriesBurned} cal</span>
                      </div>
                      <button
                        className="remove-exercise"
                        onClick={() => handleRemoveExercise(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="step-navigation">
                <button className="back-btn" onClick={() => setCurrentStep(1)}>
                  Back
                </button>
                <button
                  className="next-btn"
                  onClick={() => setCurrentStep(3)}
                  disabled={workoutData.exercises.length === 0}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Workout Summary */}
          {currentStep === 3 && (
            <div className="step-content">
              <h3>Workout Summary</h3>

              <div className="workout-summary">
                <div className="summary-item">
                  <label>Workout Type:</label>
                  <span>{workoutData.type}</span>
                </div>

                <div className="summary-item">
                  <label>Total Duration (minutes):</label>
                  <input
                    type="number"
                    min="1"
                    value={workoutData.duration}
                    onChange={(e) => setWorkoutData({
                      ...workoutData,
                      duration: e.target.value
                    })}
                    placeholder="Enter total workout duration"
                  />
                </div>

                <div className="summary-item">
                  <label>Estimated Calories Burned:</label>
                  <span>{workoutData.caloriesBurned} calories</span>
                </div>

                <div className="summary-item">
                  <label>Workout Rating:</label>
                  <div className="rating-input">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        className={`star ${workoutData.rating >= star ? 'active' : ''}`}
                        onClick={() => setWorkoutData({ ...workoutData, rating: star })}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div className="summary-item">
                  <label>Notes (optional):</label>
                  <textarea
                    value={workoutData.notes}
                    onChange={(e) => setWorkoutData({
                      ...workoutData,
                      notes: e.target.value
                    })}
                    placeholder="How did the workout feel? Any achievements?"
                    rows="3"
                  />
                </div>
              </div>

              <div className="step-navigation">
                <button className="back-btn" onClick={() => setCurrentStep(2)}>
                  Back
                </button>
                <button
                  className="submit-btn"
                  onClick={handleSubmitWorkout}
                  disabled={!workoutData.duration}
                >
                  Log Workout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkoutInputModal