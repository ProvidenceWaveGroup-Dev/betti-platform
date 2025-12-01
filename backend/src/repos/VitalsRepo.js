import { getDatabase } from '../services/database.js'

// Valid vital types
const VALID_VITAL_TYPES = [
  'blood_pressure',
  'heart_rate',
  'spo2',
  'temperature',
  'weight',
  'glucose'
]

// Default user ID (single-user mode)
const DEFAULT_USER_ID = 1

class VitalsRepo {
  get db() {
    return getDatabase()
  }

  /**
   * Validate vital type
   */
  static isValidVitalType(type) {
    return VALID_VITAL_TYPES.includes(type)
  }

  /**
   * Get valid vital types
   */
  static getValidTypes() {
    return [...VALID_VITAL_TYPES]
  }

  /**
   * Determine status based on vital type and values
   *
   * Blood Pressure (systolic/diastolic):
   * - Normal: 90-120 / 60-80
   * - Elevated: 120-129 / <80
   * - High Stage 1: 130-139 / 80-89
   * - High Stage 2: 140+ / 90+
   * - Critical: >180 / >120
   * - Low: <90 / <60
   *
   * Heart Rate:
   * - Critical: <40 or >150 bpm
   * - Low: <60 bpm
   * - Normal: 60-100 bpm
   * - High: >100 bpm
   *
   * SpO2:
   * - Normal: 95-100%
   * - Low: 90-94%
   * - Critical: <90%
   *
   * Temperature (°F):
   * - Critical Low: <95.0
   * - Low: 95.0-96.9
   * - Normal: 97.0-99.0
   * - Fever: 99.1-103.0
   * - Critical High: >103.0
   */
  static determineStatus(vitalType, valuePrimary, valueSecondary = null) {
    switch (vitalType) {
      case 'blood_pressure': {
        const systolic = valuePrimary
        const diastolic = valueSecondary || 0

        // Critical takes precedence
        if (systolic > 180 || diastolic > 120) return 'critical'

        // Low blood pressure
        if (systolic < 90 || diastolic < 60) return 'low'

        // High Stage 2 (Hypertension)
        if (systolic >= 140 || diastolic >= 90) return 'high'

        // High Stage 1
        if (systolic >= 130 || diastolic >= 80) return 'elevated'

        // Elevated (systolic only, diastolic normal)
        if (systolic >= 120 && systolic < 130 && diastolic < 80) return 'elevated'

        // Normal: 90-119 systolic AND 60-79 diastolic
        return 'normal'
      }

      case 'heart_rate':
        if (valuePrimary < 40 || valuePrimary > 150) return 'critical'
        if (valuePrimary < 60) return 'low'
        if (valuePrimary > 100) return 'high'
        return 'normal'

      case 'spo2':
        if (valuePrimary < 90) return 'critical'
        if (valuePrimary < 95) return 'low'
        return 'normal'

      case 'temperature':
        // Fahrenheit thresholds
        if (valuePrimary < 95.0 || valuePrimary > 103.0) return 'critical'
        if (valuePrimary > 99.0) return 'fever'  // 99.1-103.0
        if (valuePrimary < 97.0) return 'low'    // 95.0-96.9
        return 'normal'  // 97.0-99.0

      case 'weight':
        // Weight doesn't have a simple normal/abnormal threshold
        // Could be extended to use BMI calculation if height is available
        return 'normal'

      case 'glucose':
        // mg/dL, fasting levels
        if (valuePrimary < 54 || valuePrimary > 400) return 'critical'
        if (valuePrimary < 70) return 'low'
        if (valuePrimary > 126) return 'high'
        if (valuePrimary >= 100 && valuePrimary <= 126) return 'elevated' // Pre-diabetic range
        return 'normal'

      default:
        return 'normal'
    }
  }

  /**
   * Create a new vital reading
   */
  create({ vitalType, valuePrimary, valueSecondary = null, unit, source = 'manual', notes = null, recordedAt = null }) {
    // Validate vital type
    if (!VitalsRepo.isValidVitalType(vitalType)) {
      throw new Error(`Invalid vital_type. Must be one of: ${VALID_VITAL_TYPES.join(', ')}`)
    }

    // Determine status based on values
    const status = VitalsRepo.determineStatus(vitalType, valuePrimary, valueSecondary)

    // Use provided recordedAt or current timestamp
    const recorded = recordedAt || new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO vital_readings (user_id, vital_type, value_primary, value_secondary, unit, status, source, notes, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      DEFAULT_USER_ID,
      vitalType,
      valuePrimary,
      valueSecondary,
      unit,
      status,
      source,
      notes,
      recorded
    )

    // Return the created record
    return this.findById(result.lastInsertRowid)
  }

  /**
   * Find a vital reading by ID
   */
  findById(id) {
    const stmt = this.db.prepare(`
      SELECT id, user_id, vital_type, value_primary, value_secondary, unit, status, source, notes, recorded_at, created_at
      FROM vital_readings
      WHERE id = ?
    `)

    const row = stmt.get(id)
    if (!row) return null

    return this.formatRow(row)
  }

  /**
   * Get latest vital reading by type
   */
  getLatestByType(vitalType, userId = DEFAULT_USER_ID) {
    const stmt = this.db.prepare(`
      SELECT id, user_id, vital_type, value_primary, value_secondary, unit, status, source, notes, recorded_at, created_at
      FROM vital_readings
      WHERE user_id = ? AND vital_type = ?
      ORDER BY recorded_at DESC
      LIMIT 1
    `)

    const row = stmt.get(userId, vitalType)
    if (!row) return null

    return this.formatRow(row)
  }

  /**
   * Get all latest vitals (one per type)
   */
  getAllLatest(userId = DEFAULT_USER_ID) {
    const stmt = this.db.prepare(`
      SELECT vr.*
      FROM vital_readings vr
      INNER JOIN (
        SELECT vital_type, MAX(recorded_at) as max_recorded
        FROM vital_readings
        WHERE user_id = ?
        GROUP BY vital_type
      ) latest ON vr.vital_type = latest.vital_type AND vr.recorded_at = latest.max_recorded
      WHERE vr.user_id = ?
    `)

    const rows = stmt.all(userId, userId)
    return rows.map(row => this.formatRow(row))
  }

  /**
   * Get all vital readings from today
   */
  getToday(userId = DEFAULT_USER_ID) {
    const today = new Date().toISOString().split('T')[0]

    const stmt = this.db.prepare(`
      SELECT id, user_id, vital_type, value_primary, value_secondary, unit, status, source, notes, recorded_at, created_at
      FROM vital_readings
      WHERE user_id = ? AND DATE(recorded_at) = ?
      ORDER BY recorded_at DESC
    `)

    const rows = stmt.all(userId, today)
    return rows.map(row => this.formatRow(row))
  }

  /**
   * Get vital history for a type
   */
  getHistory(vitalType, { userId = DEFAULT_USER_ID, limit = 30, startDate = null, endDate = null } = {}) {
    let sql = `
      SELECT id, user_id, vital_type, value_primary, value_secondary, unit, status, source, notes, recorded_at, created_at
      FROM vital_readings
      WHERE user_id = ? AND vital_type = ?
    `
    const params = [userId, vitalType]

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
   * Format a database row to API response format
   */
  formatRow(row) {
    return {
      id: row.id,
      userId: row.user_id,
      vitalType: row.vital_type,
      valuePrimary: row.value_primary,
      valueSecondary: row.value_secondary,
      unit: row.unit,
      status: row.status,
      source: row.source,
      notes: row.notes,
      recordedAt: row.recorded_at,
      createdAt: row.created_at
    }
  }
}

// Export singleton instance
export default new VitalsRepo()
