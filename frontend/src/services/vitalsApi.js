// Vitals API service for communicating with backend

class VitalsApi {
  constructor() {
    // Use relative URL to leverage Vite proxy - works with ngrok
    this.baseUrl = '/api/vitals'
  }

  async request(endpoint, options = {}) {
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
      console.error(`Vitals API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Get latest vitals (formatted for frontend display)
  async getLatest() {
    return this.request('/latest')
  }

  // Get all vitals from today
  async getToday() {
    return this.request('/today')
  }

  // Get history for a specific vital type
  async getHistory(vitalType, options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.startDate) params.append('startDate', options.startDate)
    if (options.endDate) params.append('endDate', options.endDate)

    const queryString = params.toString()
    return this.request(`/history/${vitalType}${queryString ? `?${queryString}` : ''}`)
  }

  // Record a new vital reading
  async recordVital({ vitalType, valuePrimary, valueSecondary, unit, source = 'manual', notes }) {
    return this.request('/', {
      method: 'POST',
      body: JSON.stringify({
        vital_type: vitalType,
        value_primary: valuePrimary,
        value_secondary: valueSecondary,
        unit,
        source,
        notes
      })
    })
  }

  // Get valid vital types
  async getVitalTypes() {
    return this.request('/meta/types')
  }

  // Get latest vital by specific type
  async getLatestByType(vitalType) {
    return this.request(`/${vitalType}`)
  }
}

// Export singleton instance
export default new VitalsApi()
