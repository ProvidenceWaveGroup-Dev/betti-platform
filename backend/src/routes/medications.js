import express from 'express'
import { MedicationRepo } from '../services/database.js'

const router = express.Router()

// Default user ID (until auth is implemented)
const DEFAULT_USER_ID = 1

/**
 * GET /api/medications - List all medications for user
 * Query: userId, activeOnly (default true)
 */
router.get('/', (req, res) => {
  try {
    const userId = parseInt(req.query.userId) || DEFAULT_USER_ID
    const activeOnly = req.query.activeOnly !== 'false'

    const medications = MedicationRepo.getByUser(userId, activeOnly)

    res.json({
      success: true,
      data: medications,
      count: medications.length
    })
  } catch (error) {
    console.error('Error fetching medications:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medications'
    })
  }
})

/**
 * POST /api/medications - Add new medication
 * Body: { name, dosage, instructions?, prescriber?, pharmacy?, rx_number?,
 *         refills_left?, schedules: [{ time: "08:00", days: "daily" }] }
 */
router.post('/', (req, res) => {
  try {
    const {
      name,
      dosage,
      instructions,
      prescriber,
      pharmacy,
      rx_number,
      refills_left,
      schedules
    } = req.body

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Medication name is required'
      })
    }

    const medication = MedicationRepo.create(
      {
        user_id: DEFAULT_USER_ID,
        name,
        dosage,
        instructions,
        prescriber,
        pharmacy,
        rx_number,
        refills_left
      },
      schedules || []
    )

    console.log('Medication created:', medication)

    res.status(201).json({
      success: true,
      data: medication
    })
  } catch (error) {
    console.error('Error creating medication:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create medication'
    })
  }
})

/**
 * GET /api/medications/today - Get today's medication schedule with status
 * Returns: [{ medication_name, dosage, scheduled_time, status: 'pending'|'taken'|'skipped'|'late' }]
 */
router.get('/today', (req, res) => {
  try {
    const userId = parseInt(req.query.userId) || DEFAULT_USER_ID
    const schedule = MedicationRepo.getTodaySchedule(userId)

    res.json({
      success: true,
      data: schedule,
      date: new Date().toISOString().split('T')[0],
      count: schedule.length
    })
  } catch (error) {
    console.error('Error fetching today\'s schedule:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today\'s medication schedule'
    })
  }
})

/**
 * GET /api/medications/adherence - Get adherence stats for past N days
 * Query: userId, days (default 7)
 */
router.get('/adherence', (req, res) => {
  try {
    const userId = parseInt(req.query.userId) || DEFAULT_USER_ID
    const days = parseInt(req.query.days) || 7

    const stats = MedicationRepo.getAdherenceStats(userId, days)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error fetching adherence stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch adherence statistics'
    })
  }
})

/**
 * GET /api/medications/:id - Get medication with schedules
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params
    const medication = MedicationRepo.getById(parseInt(id))

    if (!medication) {
      return res.status(404).json({
        success: false,
        error: 'Medication not found'
      })
    }

    res.json({
      success: true,
      data: medication
    })
  } catch (error) {
    console.error('Error fetching medication:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medication'
    })
  }
})

/**
 * PUT /api/medications/:id - Update medication details
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      dosage,
      instructions,
      prescriber,
      pharmacy,
      rx_number,
      refills_left,
      schedules
    } = req.body

    // Check if medication exists
    const existing = MedicationRepo.getById(parseInt(id))
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Medication not found'
      })
    }

    const updated = MedicationRepo.update(parseInt(id), {
      name,
      dosage,
      instructions,
      prescriber,
      pharmacy,
      rx_number,
      refills_left,
      schedules
    })

    console.log('Medication updated:', updated)

    res.json({
      success: true,
      data: updated
    })
  } catch (error) {
    console.error('Error updating medication:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update medication'
    })
  }
})

/**
 * DELETE /api/medications/:id - Soft delete (set is_active = 0)
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params
    const deleted = MedicationRepo.softDelete(parseInt(id))

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Medication not found'
      })
    }

    console.log('Medication soft deleted:', id)

    res.json({
      success: true,
      message: 'Medication deactivated successfully'
    })
  } catch (error) {
    console.error('Error deleting medication:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete medication'
    })
  }
})

/**
 * POST /api/medications/:id/take - Mark medication as taken
 * Body: { scheduleId?, notes? }
 */
router.post('/:id/take', (req, res) => {
  try {
    const { id } = req.params
    const { scheduleId, notes } = req.body

    // Check if medication exists
    const existing = MedicationRepo.getById(parseInt(id))
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Medication not found'
      })
    }

    const logEntry = MedicationRepo.markTaken(
      parseInt(id),
      scheduleId ? parseInt(scheduleId) : null,
      notes
    )

    console.log('Medication marked as taken:', logEntry)

    res.json({
      success: true,
      message: 'Medication marked as taken',
      data: logEntry
    })
  } catch (error) {
    console.error('Error marking medication as taken:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to mark medication as taken'
    })
  }
})

/**
 * POST /api/medications/:id/skip - Mark medication as skipped
 * Body: { scheduleId?, reason? }
 */
router.post('/:id/skip', (req, res) => {
  try {
    const { id } = req.params
    const { scheduleId, reason } = req.body

    // Check if medication exists
    const existing = MedicationRepo.getById(parseInt(id))
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Medication not found'
      })
    }

    const logEntry = MedicationRepo.markSkipped(
      parseInt(id),
      scheduleId ? parseInt(scheduleId) : null,
      reason
    )

    console.log('Medication marked as skipped:', logEntry)

    res.json({
      success: true,
      message: 'Medication marked as skipped',
      data: logEntry
    })
  } catch (error) {
    console.error('Error marking medication as skipped:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to mark medication as skipped'
    })
  }
})

export default router
