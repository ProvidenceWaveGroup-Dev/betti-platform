import express from 'express'
import bleScanner from '../services/bleScanner.js'

const router = express.Router()

// POST /api/ble/scan - Start BLE scanning
router.post('/scan', async (req, res) => {
  try {
    const result = await bleScanner.startScan()

    if (result.success) {
      res.json({
        success: true,
        message: 'BLE scan started',
        duration: 10000
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      })
    }
  } catch (error) {
    console.error('Error in /api/ble/scan:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/ble/status - Get current scanning status
router.get('/status', (req, res) => {
  try {
    const status = bleScanner.getStatus()
    res.json(status)
  } catch (error) {
    console.error('Error in /api/ble/status:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
