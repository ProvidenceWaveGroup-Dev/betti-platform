import express from 'express'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// Data directory for accelerometer recordings
const DATA_DIR = join(__dirname, '../../data/accelerometer')

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
  console.log('📁 Created accelerometer data directory:', DATA_DIR)
}

/**
 * POST /api/accelerometer/save - Save accelerometer recording as CSV
 * Body: { data: [{ timestamp, x, y, z }, ...] }
 */
router.post('/save', (req, res) => {
  try {
    const { data } = req.body

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data provided'
      })
    }

    // Generate filename with timestamp
    const now = new Date()
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `accelerometer_${dateStr}.csv`
    const filepath = join(DATA_DIR, filename)

    // Create CSV content
    const csvHeader = 'timestamp_ms,x_g,y_g,z_g'
    const csvRows = data.map(row =>
      `${row.timestamp},${row.x},${row.y},${row.z}`
    )
    const csvContent = [csvHeader, ...csvRows].join('\n')

    // Write file
    writeFileSync(filepath, csvContent, 'utf8')

    console.log(`📊 Saved accelerometer recording: ${filename} (${data.length} samples)`)

    res.json({
      success: true,
      filename,
      samples: data.length,
      duration_ms: data.length > 0 ? data[data.length - 1].timestamp : 0
    })

  } catch (error) {
    console.error('Error saving accelerometer data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to save accelerometer data'
    })
  }
})

/**
 * GET /api/accelerometer/list - List saved recordings
 */
router.get('/list', (req, res) => {
  try {
    const { readdirSync, statSync } = require('fs')

    const files = readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.csv'))
      .map(filename => {
        const filepath = join(DATA_DIR, filename)
        const stats = statSync(filepath)
        return {
          filename,
          size: stats.size,
          created: stats.birthtime
        }
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created))

    res.json({
      success: true,
      files,
      count: files.length
    })

  } catch (error) {
    console.error('Error listing accelerometer files:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list recordings'
    })
  }
})

export default router
