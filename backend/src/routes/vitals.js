import express from 'express'
import VitalsRepo from '../repos/VitalsRepo.js'

const router = express.Router()

// Vital type display configuration for frontend
const VITAL_DISPLAY_CONFIG = {
  blood_pressure: { icon: '❤️', label: 'BLOOD PRESSURE' },
  heart_rate: { icon: '💓', label: 'HEART RATE' },
  spo2: { icon: '🫁', label: 'OXYGEN SAT' },
  temperature: { icon: '🌡️', label: 'TEMPERATURE' },
  weight: { icon: '⚖️', label: 'WEIGHT' },
  glucose: { icon: '🩸', label: 'BLOOD GLUCOSE' }
}

// Helper to format time ago string
function formatTimeAgo(dateString) {
  const now = new Date()
  const recorded = new Date(dateString)
  const diffMs = now - recorded
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

// Helper to format vital for frontend display
function formatVitalForDisplay(vital) {
  const config = VITAL_DISPLAY_CONFIG[vital.vitalType] || { icon: '📊', label: vital.vitalType.toUpperCase() }

  // Format value (blood pressure shows primary/secondary)
  let value
  if (vital.vitalType === 'blood_pressure' && vital.valueSecondary !== null) {
    value = `${vital.valuePrimary}/${vital.valueSecondary}`
  } else {
    value = String(vital.valuePrimary)
  }

  // Capitalize status
  const status = vital.status.charAt(0).toUpperCase() + vital.status.slice(1)

  return {
    id: vital.id,
    icon: config.icon,
    label: config.label,
    value,
    unit: vital.unit,
    status,
    updated: formatTimeAgo(vital.recordedAt),
    recordedAt: vital.recordedAt,
    source: vital.source,
    notes: vital.notes,
    vitalType: vital.vitalType
  }
}

// POST /api/vitals - Create a new vital reading
router.post('/', (req, res) => {
  try {
    const { vital_type, value_primary, value_secondary, unit, source, notes, recorded_at } = req.body

    // Validate required fields
    if (!vital_type) {
      return res.status(400).json({
        success: false,
        error: 'vital_type is required'
      })
    }

    if (value_primary === undefined || value_primary === null) {
      return res.status(400).json({
        success: false,
        error: 'value_primary is required'
      })
    }

    if (!unit) {
      return res.status(400).json({
        success: false,
        error: 'unit is required'
      })
    }

    // Validate vital_type
    if (!VitalsRepo.constructor.isValidVitalType(vital_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid vital_type. Must be one of: ${VitalsRepo.constructor.getValidTypes().join(', ')}`
      })
    }

    // Create the vital reading
    const vital = VitalsRepo.create({
      vitalType: vital_type,
      valuePrimary: parseFloat(value_primary),
      valueSecondary: value_secondary ? parseFloat(value_secondary) : null,
      unit,
      source: source || 'manual',
      notes: notes || null,
      recordedAt: recorded_at || null
    })

    res.status(201).json({
      success: true,
      data: vital
    })
  } catch (error) {
    console.error('Error creating vital reading:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/vitals - Get all latest vitals (one per type)
router.get('/', (req, res) => {
  try {
    const vitals = VitalsRepo.getAllLatest()

    res.json({
      success: true,
      data: vitals
    })
  } catch (error) {
    console.error('Error fetching vitals:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/vitals/latest - Get most recent reading for each vital type (formatted for frontend)
router.get('/latest', (req, res) => {
  try {
    const { userId = 1 } = req.query
    const vitals = VitalsRepo.getAllLatest(parseInt(userId))

    // Format for frontend display
    const formatted = vitals.map(formatVitalForDisplay)

    res.json({
      success: true,
      data: formatted
    })
  } catch (error) {
    console.error('Error fetching latest vitals:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/vitals/today - Get all readings from today
router.get('/today', (req, res) => {
  try {
    const { userId = 1 } = req.query
    const vitals = VitalsRepo.getToday(parseInt(userId))

    // Format for frontend display
    const formatted = vitals.map(formatVitalForDisplay)

    res.json({
      success: true,
      data: formatted
    })
  } catch (error) {
    console.error('Error fetching today vitals:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/vitals/history/:type - Get historical readings for a specific vital
router.get('/history/:type', (req, res) => {
  try {
    const { type } = req.params
    const { userId = 1, startDate, endDate, limit = 30 } = req.query

    if (!VitalsRepo.constructor.isValidVitalType(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid vital_type. Must be one of: ${VitalsRepo.constructor.getValidTypes().join(', ')}`
      })
    }

    const history = VitalsRepo.getHistory(type, {
      userId: parseInt(userId),
      limit: parseInt(limit),
      startDate: startDate || null,
      endDate: endDate || null
    })

    // Format for frontend display
    const formatted = history.map(formatVitalForDisplay)

    res.json({
      success: true,
      data: formatted
    })
  } catch (error) {
    console.error('Error fetching vital history:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/vitals/meta/types - Get valid vital types
router.get('/meta/types', (req, res) => {
  res.json({
    success: true,
    data: VitalsRepo.constructor.getValidTypes()
  })
})

// GET /api/vitals/:type - Get latest vital by type
router.get('/:type', (req, res) => {
  try {
    const { type } = req.params

    if (!VitalsRepo.constructor.isValidVitalType(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid vital_type. Must be one of: ${VitalsRepo.constructor.getValidTypes().join(', ')}`
      })
    }

    const vital = VitalsRepo.getLatestByType(type)

    if (!vital) {
      return res.status(404).json({
        success: false,
        error: `No ${type} readings found`
      })
    }

    res.json({
      success: true,
      data: vital
    })
  } catch (error) {
    console.error('Error fetching vital:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
