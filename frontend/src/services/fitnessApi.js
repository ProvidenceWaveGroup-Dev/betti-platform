// Fitness API service for communicating with backend

class FitnessApi {
  constructor() {
    // For now, use local data. Later this will connect to a dedicated fitness API server
    this.useLocalData = true
  }

  async request(endpoint, options = {}) {
    if (this.useLocalData) {
      // Simulate API responses with local data for now
      return this.handleLocalRequest(endpoint, options)
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error(`Fitness API request failed: ${endpoint}`, error)
      throw error
    }
  }

  async handleLocalRequest(endpoint, options = {}) {
    // Simulate different API endpoints with local data
    try {
      // Handle endpoints with query parameters
      const [baseEndpoint, queryParams] = endpoint.split('?')

      switch (baseEndpoint) {
        case '/daily':
          const fitnessResponse = await fetch('/src/data/fitness.json')
          const fitnessData = await fitnessResponse.json()
          return { success: true, data: fitnessData.dailySummary }

        case '/exercises':
          const exerciseResponse = await fetch('/src/data/exercises-database.json')
          const exerciseData = await exerciseResponse.json()
          return { success: true, data: exerciseData.exercises }

        case '/workout-history':
          const extendedResponse = await fetch('/src/data/fitness-extended.json')
          const extendedData = await extendedResponse.json()
          return { success: true, data: extendedData.workoutHistory || [] }

        case '/log-workout':
          // Simulate successful workout logging
          return { success: true, message: 'Workout logged successfully' }

        case '/goals':
          const goalsResponse = await fetch('/src/data/fitness-extended.json')
          const goalsData = await goalsResponse.json()
          return { success: true, data: goalsData.goals }

        default:
          throw new Error(`Unknown endpoint: ${endpoint}`)
      }
    } catch (error) {
      throw new Error(`Local data request failed: ${error.message}`)
    }
  }

  // Get daily fitness summary
  async getDailySummary(date = null) {
    const params = date ? `?date=${date}` : ''
    return this.request(`/daily${params}`)
  }

  // Log a new workout
  async logWorkout(workoutData) {
    return this.request('/log-workout', {
      method: 'POST',
      body: JSON.stringify(workoutData)
    })
  }

  // Search exercises in database
  async searchExercises(query, limit = 20) {
    const result = await this.request('/exercises')

    if (query && query.length > 0) {
      const filteredExercises = result.data.filter(exercise =>
        exercise.name.toLowerCase().includes(query.toLowerCase()) ||
        exercise.category.toLowerCase().includes(query.toLowerCase()) ||
        exercise.type.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit)

      return { success: true, data: filteredExercises }
    }

    return { success: true, data: result.data.slice(0, limit) }
  }

  // Get fitness goals
  async getFitnessGoals() {
    return this.request('/goals')
  }

  // Update fitness goals
  async updateFitnessGoals(goals) {
    return this.request('/goals', {
      method: 'PUT',
      body: JSON.stringify(goals)
    })
  }

  // Get workout history
  async getWorkoutHistory(options = {}) {
    const params = new URLSearchParams()
    if (options.startDate) params.append('startDate', options.startDate)
    if (options.endDate) params.append('endDate', options.endDate)
    if (options.days) params.append('days', options.days.toString())

    const queryString = params.toString()
    return this.request(`/workout-history${queryString ? `?${queryString}` : ''}`)
  }

  // Delete a workout
  async deleteWorkout(workoutId) {
    return this.request(`/workout/${workoutId}`, {
      method: 'DELETE'
    })
  }

  // Get recent exercises
  async getRecentExercises(limit = 10) {
    const result = await this.searchExercises('', limit)
    return result
  }

  // Helper method to get all data needed for fitness component
  async getFitnessDashboardData(date = null) {
    try {
      const [dailySummary, recentExercises, workoutHistory] = await Promise.all([
        this.getDailySummary(date),
        this.getRecentExercises(5),
        this.getWorkoutHistory({ days: 7 })
      ])

      return {
        dailySummary: dailySummary.data,
        recentExercises: recentExercises.data,
        workoutHistory: workoutHistory.data,
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to load fitness dashboard data:', error)
      throw error
    }
  }

  // Calculate calories burned based on exercise and duration
  calculateCaloriesBurned(exercise, durationMinutes) {
    const caloriesPerMinute = exercise.calories_per_minute || 8 // default fallback
    return Math.round(caloriesPerMinute * durationMinutes)
  }

  // Get exercises by category
  async getExercisesByCategory(category) {
    const result = await this.request('/exercises')
    const categoryExercises = result.data.filter(exercise =>
      exercise.category.toLowerCase() === category.toLowerCase()
    )
    return { success: true, data: categoryExercises }
  }

  // Get exercises by type (Strength, Cardio, etc.)
  async getExercisesByType(type) {
    const result = await this.request('/exercises')
    const typeExercises = result.data.filter(exercise =>
      exercise.type.toLowerCase() === type.toLowerCase()
    )
    return { success: true, data: typeExercises }
  }
}

// Export singleton instance
export default new FitnessApi()