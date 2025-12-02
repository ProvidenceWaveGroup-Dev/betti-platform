// Medications API service for communicating with backend

class MedicationsApi {
  constructor() {
    // Determine the backend URL based on environment
    const isNgrok = window.location.hostname.includes('ngrok')
    const isHttps = window.location.protocol === 'https:'

    if (isNgrok || isHttps) {
      // Use Vite proxy (same origin) for ngrok/HTTPS
      this.baseUrl = '/api/medications'
    } else {
      // Direct backend connection for local development
      this.baseUrl = `http://${window.location.hostname}:3001/api/medications`
    }
  }

  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const response = await fetch(url, {
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
      console.error(`Medications API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Get all medications for user
  async getMedications(activeOnly = true) {
    return this.request(`?activeOnly=${activeOnly}`)
  }

  // Get a single medication by ID
  async getMedication(id) {
    return this.request(`/${id}`)
  }

  // Create a new medication
  async createMedication(medicationData) {
    return this.request('', {
      method: 'POST',
      body: JSON.stringify(medicationData)
    })
  }

  // Update a medication
  async updateMedication(id, data) {
    return this.request(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  // Delete (deactivate) a medication
  async deleteMedication(id) {
    return this.request(`/${id}`, {
      method: 'DELETE'
    })
  }

  // Get today's schedule with status
  async getTodaySchedule() {
    return this.request('/today')
  }

  // Mark medication as taken
  async markTaken(medicationId, scheduleId = null, notes = null) {
    return this.request(`/${medicationId}/take`, {
      method: 'POST',
      body: JSON.stringify({ scheduleId, notes })
    })
  }

  // Mark medication as skipped
  async markSkipped(medicationId, scheduleId = null, reason = null) {
    return this.request(`/${medicationId}/skip`, {
      method: 'POST',
      body: JSON.stringify({ scheduleId, reason })
    })
  }

  // Get adherence statistics
  async getAdherenceStats(days = 7) {
    return this.request(`/adherence?days=${days}`)
  }

  // Transform backend format to frontend format
  // Backend: { medication_id, medication_name, dosage, scheduled_time, status, ... }
  // Frontend: { id, name, time, taken, type }
  transformForFrontend(scheduleItems) {
    return scheduleItems.map(item => ({
      id: item.medication_id,
      scheduleId: item.schedule_id,
      name: item.medication_name,
      dosage: item.dosage,
      time: item.scheduled_time,
      taken: item.status === 'taken',
      type: this.inferType(item.medication_name, item.dosage),
      status: item.status,
      instructions: item.instructions,
      takenAt: item.taken_at
    }))
  }

  // Infer medication type from name/dosage for icon display
  inferType(name, dosage) {
    const nameLower = (name || '').toLowerCase()
    const dosageLower = (dosage || '').toLowerCase()

    if (nameLower.includes('vitamin') || nameLower.includes('multi')) {
      return 'vitamin'
    }
    if (nameLower.includes('supplement') || nameLower.includes('omega') ||
        nameLower.includes('probiotic') || nameLower.includes('fiber')) {
      return 'supplement'
    }
    // Default to prescription for anything else
    return 'prescription'
  }

  // Helper to get today's medications in frontend format
  async getTodayMedications() {
    try {
      const response = await this.getTodaySchedule()
      if (response.success && response.data) {
        return {
          success: true,
          data: this.transformForFrontend(response.data),
          date: response.date
        }
      }
      return response
    } catch (error) {
      console.error('Failed to get today\'s medications:', error)
      throw error
    }
  }

  // Toggle medication status (take if pending/late, or mark as taken again)
  async toggleMedication(medicationId, scheduleId, currentlyTaken) {
    if (currentlyTaken) {
      // Already taken - could implement "undo" here if needed
      // For now, do nothing or you could mark as skipped
      return { success: true, message: 'Already taken' }
    } else {
      return this.markTaken(medicationId, scheduleId)
    }
  }
}

// Export singleton instance
export default new MedicationsApi()
