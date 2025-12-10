import { getDatabase } from '../services/database.js'

// Default user ID (single-user mode)
const DEFAULT_USER_ID = 1

class EnvironmentalRepo {
  get db() {
    return getDatabase()
  }

  /**
   * Run migrations to create table if it doesn't exist
   */
  runMigrations() {
    const db = this.db

    // Create table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS environmental_readings (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER NOT NULL,
        device_name     TEXT NOT NULL,
        temperature     REAL,
        temperature_c   REAL,
        humidity        REAL,
        light           REAL,
        imu_x           REAL,
        imu_y           REAL,
        imu_z           REAL,
        recorded_at     DATETIME NOT NULL,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes if they don't exist
    try {
      db.exec('CREATE INDEX IF NOT EXISTS idx_environmental_user_date ON environmental_readings(user_id, recorded_at DESC)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_environmental_device ON environmental_readings(device_name, recorded_at DESC)')
    } catch (e) {
      // Indexes may already exist
    }
  }

  /**
   * Create a new environmental reading
   */
  create({ deviceName, temperature, temperatureC, humidity, light, imuX, imuY, imuZ, recordedAt = null }) {
    this.runMigrations()

    const recorded = recordedAt || new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO environmental_readings (user_id, device_name, temperature, temperature_c, humidity, light, imu_x, imu_y, imu_z, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      DEFAULT_USER_ID,
      deviceName,
      temperature,
      temperatureC,
      humidity,
      light,
      imuX,
      imuY,
      imuZ,
      recorded
    )

    return this.findById(result.lastInsertRowid)
  }

  /**
   * Find a reading by ID
   */
  findById(id) {
    const stmt = this.db.prepare(`
      SELECT * FROM environmental_readings WHERE id = ?
    `)

    const row = stmt.get(id)
    if (!row) return null

    return this.formatRow(row)
  }

  /**
   * Get the latest reading for a device
   */
  getLatest(deviceName, userId = DEFAULT_USER_ID) {
    this.runMigrations()

    const stmt = this.db.prepare(`
      SELECT * FROM environmental_readings
      WHERE user_id = ? AND device_name = ?
      ORDER BY recorded_at DESC
      LIMIT 1
    `)

    const row = stmt.get(userId, deviceName)
    if (!row) return null

    return this.formatRow(row)
  }

  /**
   * Get readings history for a device
   */
  getHistory(deviceName, { userId = DEFAULT_USER_ID, limit = 100, startDate = null, endDate = null } = {}) {
    this.runMigrations()

    let sql = `
      SELECT * FROM environmental_readings
      WHERE user_id = ? AND device_name = ?
    `
    const params = [userId, deviceName]

    if (startDate) {
      sql += ' AND recorded_at >= ?'
      params.push(startDate)
    }
    if (endDate) {
      sql += ' AND recorded_at <= ?'
      params.push(endDate)
    }

    sql += ' ORDER BY recorded_at DESC LIMIT ?'
    params.push(limit)

    const stmt = this.db.prepare(sql)
    const rows = stmt.all(...params)

    return rows.map(row => this.formatRow(row))
  }

  /**
   * Get today's readings for a device
   */
  getToday(deviceName, userId = DEFAULT_USER_ID) {
    this.runMigrations()

    const today = new Date().toISOString().split('T')[0]

    const stmt = this.db.prepare(`
      SELECT * FROM environmental_readings
      WHERE user_id = ? AND device_name = ? AND DATE(recorded_at) = ?
      ORDER BY recorded_at DESC
    `)

    const rows = stmt.all(userId, deviceName, today)
    return rows.map(row => this.formatRow(row))
  }

  /**
   * Get daily averages for a device
   */
  getDailyAverages(deviceName, { userId = DEFAULT_USER_ID, days = 7 } = {}) {
    this.runMigrations()

    const stmt = this.db.prepare(`
      SELECT
        DATE(recorded_at) as date,
        AVG(temperature) as avg_temperature,
        AVG(humidity) as avg_humidity,
        AVG(light) as avg_light,
        MIN(temperature) as min_temperature,
        MAX(temperature) as max_temperature,
        MIN(humidity) as min_humidity,
        MAX(humidity) as max_humidity,
        COUNT(*) as reading_count
      FROM environmental_readings
      WHERE user_id = ?
        AND device_name = ?
        AND recorded_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(recorded_at)
      ORDER BY date DESC
    `)

    return stmt.all(userId, deviceName, days)
  }

  /**
   * Delete old readings (cleanup)
   */
  deleteOlderThan(days) {
    this.runMigrations()

    const stmt = this.db.prepare(`
      DELETE FROM environmental_readings
      WHERE recorded_at < datetime('now', '-' || ? || ' days')
    `)

    const result = stmt.run(days)
    return result.changes
  }

  /**
   * Format a database row to API response format
   */
  formatRow(row) {
    return {
      id: row.id,
      userId: row.user_id,
      deviceName: row.device_name,
      temperature: row.temperature,
      temperatureC: row.temperature_c,
      humidity: row.humidity,
      light: row.light,
      imu: {
        x: row.imu_x,
        y: row.imu_y,
        z: row.imu_z
      },
      recordedAt: row.recorded_at,
      createdAt: row.created_at
    }
  }
}

// Export singleton instance
export default new EnvironmentalRepo()
