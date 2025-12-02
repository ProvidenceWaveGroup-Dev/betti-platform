import Database from 'better-sqlite3'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Database singleton
let db = null

/**
 * Initialize the SQLite database connection
 * Creates the database and runs schema if it doesn't exist
 */
export function initDatabase() {
  if (db) {
    console.log('📦 Database already initialized')
    return db
  }

  const dbPath = join(__dirname, '../../data/betti.db')
  const schemaPath = join(__dirname, '../schema/betti-schema.sql')

  const dbExists = existsSync(dbPath)

  try {
    db = new Database(dbPath)

    // Enable foreign keys and WAL mode
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')

    if (!dbExists) {
      console.log('📦 Creating new database...')
      if (existsSync(schemaPath)) {
        const schema = readFileSync(schemaPath, 'utf8')
        db.exec(schema)
        console.log('📦 Schema applied successfully')
      } else {
        console.warn('⚠️ Schema file not found at:', schemaPath)
      }
    }

    // Verify database is working
    const tableCount = db.prepare(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
    ).get()

    console.log(`📦 Database initialized: ${dbPath}`)
    console.log(`   Tables: ${tableCount.count}`)

    return db
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message)
    throw error
  }
}

/**
 * Get the database instance
 * Throws if database hasn't been initialized
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

/**
 * Close the database connection gracefully
 */
export function closeDatabase() {
  if (db) {
    try {
      db.close()
      db = null
      console.log('📦 Database connection closed')
    } catch (error) {
      console.error('❌ Error closing database:', error.message)
    }
  }
}

/**
 * Check if database is connected
 */
export function isDatabaseConnected() {
  return db !== null && db.open
}

// ============================================================================
// WORKOUT REPOSITORY
// ============================================================================

export const WorkoutRepo = {
  /**
   * Create a new workout
   * @param {Object} workout - Workout data
   * @returns {Object} Created workout with id
   */
  create(workout) {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO workouts (
        user_id, workout_type, duration_min, calories_burned, distance_miles,
        steps, heart_rate_avg, heart_rate_max, intensity, video_id, notes,
        started_at, ended_at
      ) VALUES (
        @user_id, @workout_type, @duration_min, @calories_burned, @distance_miles,
        @steps, @heart_rate_avg, @heart_rate_max, @intensity, @video_id, @notes,
        @started_at, @ended_at
      )
    `)

    const result = stmt.run({
      user_id: workout.user_id || 1,
      workout_type: workout.workout_type,
      duration_min: workout.duration_min || null,
      calories_burned: workout.calories_burned || null,
      distance_miles: workout.distance_miles || null,
      steps: workout.steps || null,
      heart_rate_avg: workout.heart_rate_avg || null,
      heart_rate_max: workout.heart_rate_max || null,
      intensity: workout.intensity || 'moderate',
      video_id: workout.video_id || null,
      notes: workout.notes || null,
      started_at: workout.started_at,
      ended_at: workout.ended_at || null
    })

    return { id: result.lastInsertRowid, ...workout }
  },

  /**
   * Get a workout by ID
   * @param {number} id - Workout ID
   * @returns {Object|null} Workout or null if not found
   */
  getById(id) {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM workouts WHERE id = ?')
    return stmt.get(id) || null
  },

  /**
   * Get workouts within a date range
   * @param {number} userId - User ID
   * @param {string} startDate - Start date (YYYY-MM-DD or ISO string)
   * @param {string} endDate - End date (YYYY-MM-DD or ISO string)
   * @param {number} limit - Max results (default 50)
   * @returns {Array} List of workouts
   */
  getByDateRange(userId, startDate, endDate, limit = 50) {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM workouts
      WHERE user_id = ?
        AND date(started_at) >= date(?)
        AND date(started_at) <= date(?)
      ORDER BY started_at DESC
      LIMIT ?
    `)
    return stmt.all(userId, startDate, endDate, limit)
  },

  /**
   * Get workouts by type
   * @param {number} userId - User ID
   * @param {string} workoutType - Type of workout
   * @param {number} limit - Max results (default 20)
   * @returns {Array} List of workouts
   */
  getByType(userId, workoutType, limit = 20) {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM workouts
      WHERE user_id = ?
        AND LOWER(workout_type) = LOWER(?)
      ORDER BY started_at DESC
      LIMIT ?
    `)
    return stmt.all(userId, workoutType, limit)
  },

  /**
   * Delete a workout by ID
   * @param {number} id - Workout ID
   * @returns {boolean} True if deleted, false if not found
   */
  delete(id) {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM workouts WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  /**
   * Get today's activity summary including workouts
   * @param {number} userId - User ID
   * @returns {Object} Today's summary with workouts array
   */
  getTodaySummary(userId) {
    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0]

    // Get today's workouts
    const workoutsStmt = db.prepare(`
      SELECT * FROM workouts
      WHERE user_id = ?
        AND date(started_at) = date(?)
      ORDER BY started_at DESC
    `)
    const workouts = workoutsStmt.all(userId, today)

    // Get daily activity record if exists
    const activityStmt = db.prepare(`
      SELECT * FROM daily_activity
      WHERE user_id = ? AND activity_date = ?
    `)
    const activity = activityStmt.get(userId, today)

    // Calculate workout totals
    const workoutTotals = workouts.reduce((acc, w) => ({
      duration_min: acc.duration_min + (w.duration_min || 0),
      calories_burned: acc.calories_burned + (w.calories_burned || 0),
      steps: acc.steps + (w.steps || 0),
      distance_miles: acc.distance_miles + (w.distance_miles || 0)
    }), { duration_min: 0, calories_burned: 0, steps: 0, distance_miles: 0 })

    return {
      date: today,
      steps: activity?.steps || workoutTotals.steps,
      active_minutes: activity?.active_minutes || workoutTotals.duration_min,
      calories_burned: activity?.calories_burned || workoutTotals.calories_burned,
      floors_climbed: activity?.floors_climbed || 0,
      distance_miles: activity?.distance_miles || workoutTotals.distance_miles,
      workouts_count: workouts.length,
      workouts: workouts
    }
  },

  /**
   * Get weekly activity summary (past 7 days)
   * @param {number} userId - User ID
   * @returns {Object} Weekly summary with daily breakdown
   */
  getWeeklySummary(userId) {
    const db = getDatabase()

    // Generate last 7 days
    const dates = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }

    // Get daily activity for the week
    const activityStmt = db.prepare(`
      SELECT * FROM daily_activity
      WHERE user_id = ?
        AND activity_date >= ?
        AND activity_date <= ?
      ORDER BY activity_date
    `)
    const activities = activityStmt.all(userId, dates[0], dates[6])
    const activityMap = new Map(activities.map(a => [a.activity_date, a]))

    // Get workouts for the week
    const workoutsStmt = db.prepare(`
      SELECT date(started_at) as workout_date,
             COUNT(*) as workout_count,
             COALESCE(SUM(duration_min), 0) as total_duration,
             COALESCE(SUM(calories_burned), 0) as total_calories,
             COALESCE(SUM(steps), 0) as total_steps,
             COALESCE(SUM(distance_miles), 0) as total_distance
      FROM workouts
      WHERE user_id = ?
        AND date(started_at) >= ?
        AND date(started_at) <= ?
      GROUP BY date(started_at)
    `)
    const workoutsByDay = workoutsStmt.all(userId, dates[0], dates[6])
    const workoutMap = new Map(workoutsByDay.map(w => [w.workout_date, w]))

    // Build daily summaries
    const days = dates.map(date => {
      const activity = activityMap.get(date)
      const workout = workoutMap.get(date)

      return {
        date,
        steps: activity?.steps || workout?.total_steps || 0,
        active_minutes: activity?.active_minutes || workout?.total_duration || 0,
        calories_burned: activity?.calories_burned || workout?.total_calories || 0,
        floors_climbed: activity?.floors_climbed || 0,
        distance_miles: activity?.distance_miles || workout?.total_distance || 0,
        workouts_count: workout?.workout_count || 0
      }
    })

    // Calculate totals
    const totals = days.reduce((acc, day) => ({
      steps: acc.steps + day.steps,
      active_minutes: acc.active_minutes + day.active_minutes,
      calories_burned: acc.calories_burned + day.calories_burned,
      floors_climbed: acc.floors_climbed + day.floors_climbed,
      distance_miles: acc.distance_miles + day.distance_miles,
      workouts_count: acc.workouts_count + day.workouts_count
    }), { steps: 0, active_minutes: 0, calories_burned: 0, floors_climbed: 0, distance_miles: 0, workouts_count: 0 })

    // Calculate averages
    const averages = {
      steps: Math.round(totals.steps / 7),
      active_minutes: Math.round(totals.active_minutes / 7),
      calories_burned: Math.round(totals.calories_burned / 7),
      floors_climbed: Math.round(totals.floors_climbed / 7),
      distance_miles: Math.round(totals.distance_miles * 10 / 7) / 10
    }

    return {
      start_date: dates[0],
      end_date: dates[6],
      days,
      totals,
      averages
    }
  },

  /**
   * Update or insert daily activity record (upsert)
   * @param {number} userId - User ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @param {Object} data - Activity data to update
   * @returns {Object} Updated daily activity record
   */
  updateDailyActivity(userId, date, data) {
    const db = getDatabase()

    // Check if record exists
    const existingStmt = db.prepare(`
      SELECT * FROM daily_activity WHERE user_id = ? AND activity_date = ?
    `)
    const existing = existingStmt.get(userId, date)

    if (existing) {
      // Update existing record
      const updateStmt = db.prepare(`
        UPDATE daily_activity SET
          steps = COALESCE(@steps, steps),
          active_minutes = COALESCE(@active_minutes, active_minutes),
          calories_burned = COALESCE(@calories_burned, calories_burned),
          floors_climbed = COALESCE(@floors_climbed, floors_climbed),
          distance_miles = COALESCE(@distance_miles, distance_miles),
          source = COALESCE(@source, source),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = @user_id AND activity_date = @activity_date
      `)

      updateStmt.run({
        user_id: userId,
        activity_date: date,
        steps: data.steps ?? null,
        active_minutes: data.active_minutes ?? null,
        calories_burned: data.calories_burned ?? null,
        floors_climbed: data.floors_climbed ?? null,
        distance_miles: data.distance_miles ?? null,
        source: data.source ?? null
      })
    } else {
      // Insert new record
      const insertStmt = db.prepare(`
        INSERT INTO daily_activity (
          user_id, activity_date, steps, active_minutes, calories_burned,
          floors_climbed, distance_miles, source
        ) VALUES (
          @user_id, @activity_date, @steps, @active_minutes, @calories_burned,
          @floors_climbed, @distance_miles, @source
        )
      `)

      insertStmt.run({
        user_id: userId,
        activity_date: date,
        steps: data.steps || 0,
        active_minutes: data.active_minutes || 0,
        calories_burned: data.calories_burned || 0,
        floors_climbed: data.floors_climbed || 0,
        distance_miles: data.distance_miles || 0,
        source: data.source || 'manual'
      })
    }

    // Return the updated record
    return existingStmt.get(userId, date)
  }
}

// ============================================================================
// MEDICATION REPOSITORY
// ============================================================================

export const MedicationRepo = {
  /**
   * Create a new medication with optional schedules
   * @param {Object} medication - Medication data
   * @param {Array} schedules - Optional array of schedule objects
   * @returns {Object} Created medication with id and schedules
   */
  create(medication, schedules = []) {
    const db = getDatabase()

    const stmt = db.prepare(`
      INSERT INTO medications (
        user_id, name, dosage, instructions, prescriber,
        pharmacy, rx_number, refills_left, is_active
      ) VALUES (
        @user_id, @name, @dosage, @instructions, @prescriber,
        @pharmacy, @rx_number, @refills_left, @is_active
      )
    `)

    const result = stmt.run({
      user_id: medication.user_id || 1,
      name: medication.name,
      dosage: medication.dosage || null,
      instructions: medication.instructions || null,
      prescriber: medication.prescriber || null,
      pharmacy: medication.pharmacy || null,
      rx_number: medication.rx_number || null,
      refills_left: medication.refills_left ?? null,
      is_active: medication.is_active ?? 1
    })

    const medicationId = result.lastInsertRowid

    // Add schedules if provided
    const createdSchedules = []
    if (schedules.length > 0) {
      const scheduleStmt = db.prepare(`
        INSERT INTO medication_schedules (medication_id, schedule_time, days_of_week, is_active)
        VALUES (@medication_id, @schedule_time, @days_of_week, @is_active)
      `)

      for (const schedule of schedules) {
        const scheduleResult = scheduleStmt.run({
          medication_id: medicationId,
          schedule_time: schedule.time || schedule.schedule_time,
          days_of_week: schedule.days || schedule.days_of_week || 'daily',
          is_active: schedule.is_active ?? 1
        })
        createdSchedules.push({
          id: scheduleResult.lastInsertRowid,
          schedule_time: schedule.time || schedule.schedule_time,
          days_of_week: schedule.days || schedule.days_of_week || 'daily',
          is_active: 1
        })
      }
    }

    return {
      id: medicationId,
      ...medication,
      schedules: createdSchedules
    }
  },

  /**
   * Get a medication by ID with its schedules
   * @param {number} id - Medication ID
   * @returns {Object|null} Medication with schedules or null
   */
  getById(id) {
    const db = getDatabase()

    const medStmt = db.prepare('SELECT * FROM medications WHERE id = ?')
    const medication = medStmt.get(id)

    if (!medication) return null

    const scheduleStmt = db.prepare(`
      SELECT * FROM medication_schedules WHERE medication_id = ? AND is_active = 1
    `)
    medication.schedules = scheduleStmt.all(id)

    return medication
  },

  /**
   * Get all medications for a user
   * @param {number} userId - User ID
   * @param {boolean} activeOnly - Only return active medications (default true)
   * @returns {Array} List of medications with schedules
   */
  getByUser(userId, activeOnly = true) {
    const db = getDatabase()

    let query = 'SELECT * FROM medications WHERE user_id = ?'
    if (activeOnly) {
      query += ' AND is_active = 1'
    }
    query += ' ORDER BY name'

    const medications = db.prepare(query).all(userId)

    // Get schedules for each medication
    const scheduleStmt = db.prepare(`
      SELECT * FROM medication_schedules WHERE medication_id = ? AND is_active = 1
    `)

    for (const med of medications) {
      med.schedules = scheduleStmt.all(med.id)
    }

    return medications
  },

  /**
   * Update a medication
   * @param {number} id - Medication ID
   * @param {Object} data - Fields to update
   * @returns {Object|null} Updated medication or null
   */
  update(id, data) {
    const db = getDatabase()

    const updateStmt = db.prepare(`
      UPDATE medications SET
        name = COALESCE(@name, name),
        dosage = COALESCE(@dosage, dosage),
        instructions = COALESCE(@instructions, instructions),
        prescriber = COALESCE(@prescriber, prescriber),
        pharmacy = COALESCE(@pharmacy, pharmacy),
        rx_number = COALESCE(@rx_number, rx_number),
        refills_left = COALESCE(@refills_left, refills_left),
        is_active = COALESCE(@is_active, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)

    updateStmt.run({
      id,
      name: data.name ?? null,
      dosage: data.dosage ?? null,
      instructions: data.instructions ?? null,
      prescriber: data.prescriber ?? null,
      pharmacy: data.pharmacy ?? null,
      rx_number: data.rx_number ?? null,
      refills_left: data.refills_left ?? null,
      is_active: data.is_active ?? null
    })

    // Update schedules if provided
    if (data.schedules) {
      // Deactivate existing schedules
      db.prepare('UPDATE medication_schedules SET is_active = 0 WHERE medication_id = ?').run(id)

      // Add new schedules
      const scheduleStmt = db.prepare(`
        INSERT INTO medication_schedules (medication_id, schedule_time, days_of_week, is_active)
        VALUES (@medication_id, @schedule_time, @days_of_week, 1)
      `)

      for (const schedule of data.schedules) {
        scheduleStmt.run({
          medication_id: id,
          schedule_time: schedule.time || schedule.schedule_time,
          days_of_week: schedule.days || schedule.days_of_week || 'daily'
        })
      }
    }

    return this.getById(id)
  },

  /**
   * Soft delete a medication (set is_active = 0)
   * @param {number} id - Medication ID
   * @returns {boolean} True if updated
   */
  softDelete(id) {
    const db = getDatabase()
    const stmt = db.prepare('UPDATE medications SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  /**
   * Get today's medication schedule with status
   * @param {number} userId - User ID
   * @returns {Array} Today's medications with status
   */
  getTodaySchedule(userId) {
    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0]
    const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]

    // Get all active medications with their schedules
    const query = `
      SELECT
        m.id as medication_id,
        m.name as medication_name,
        m.dosage,
        m.instructions,
        ms.id as schedule_id,
        ms.schedule_time,
        ms.days_of_week,
        ml.id as log_id,
        ml.status,
        ml.taken_at,
        ml.notes
      FROM medications m
      JOIN medication_schedules ms ON m.id = ms.medication_id AND ms.is_active = 1
      LEFT JOIN medication_log ml ON m.id = ml.medication_id
        AND ml.schedule_id = ms.id
        AND ml.scheduled_date = ?
      WHERE m.user_id = ?
        AND m.is_active = 1
        AND (ms.days_of_week = 'daily' OR ms.days_of_week LIKE ?)
      ORDER BY ms.schedule_time
    `

    const rows = db.prepare(query).all(today, userId, `%${dayOfWeek}%`)

    // Determine status for each scheduled medication
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // 'HH:MM'

    return rows.map(row => {
      let status = row.status || 'pending'

      // If no log entry exists and time has passed, create one as 'pending'
      if (!row.log_id && row.schedule_time < currentTime) {
        // Check if it's more than 30 minutes late
        const scheduledMinutes = parseInt(row.schedule_time.split(':')[0]) * 60 + parseInt(row.schedule_time.split(':')[1])
        const currentMinutes = now.getHours() * 60 + now.getMinutes()

        if (currentMinutes - scheduledMinutes > 30) {
          status = 'late'
        }
      }

      return {
        medication_id: row.medication_id,
        medication_name: row.medication_name,
        dosage: row.dosage,
        instructions: row.instructions,
        schedule_id: row.schedule_id,
        scheduled_time: row.schedule_time,
        status,
        taken_at: row.taken_at,
        notes: row.notes
      }
    })
  },

  /**
   * Mark medication as taken
   * @param {number} medicationId - Medication ID
   * @param {number|null} scheduleId - Schedule ID (optional)
   * @param {string|null} notes - Optional notes
   * @returns {Object} The log entry
   */
  markTaken(medicationId, scheduleId = null, notes = null) {
    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // Check if log entry exists for today
    let logId
    if (scheduleId) {
      const existingLog = db.prepare(`
        SELECT id FROM medication_log
        WHERE medication_id = ? AND schedule_id = ? AND scheduled_date = ?
      `).get(medicationId, scheduleId, today)

      if (existingLog) {
        // Update existing
        db.prepare(`
          UPDATE medication_log SET status = 'taken', taken_at = ?, notes = COALESCE(?, notes)
          WHERE id = ?
        `).run(now, notes, existingLog.id)
        logId = existingLog.id
      } else {
        // Insert new
        const schedule = db.prepare('SELECT schedule_time FROM medication_schedules WHERE id = ?').get(scheduleId)
        const result = db.prepare(`
          INSERT INTO medication_log (medication_id, schedule_id, scheduled_date, scheduled_time, status, taken_at, notes)
          VALUES (?, ?, ?, ?, 'taken', ?, ?)
        `).run(medicationId, scheduleId, today, schedule?.schedule_time, now, notes)
        logId = result.lastInsertRowid
      }
    } else {
      // No schedule ID, just log the take
      const result = db.prepare(`
        INSERT INTO medication_log (medication_id, scheduled_date, status, taken_at, notes)
        VALUES (?, ?, 'taken', ?, ?)
      `).run(medicationId, today, now, notes)
      logId = result.lastInsertRowid
    }

    return db.prepare('SELECT * FROM medication_log WHERE id = ?').get(logId)
  },

  /**
   * Mark medication as skipped
   * @param {number} medicationId - Medication ID
   * @param {number|null} scheduleId - Schedule ID (optional)
   * @param {string|null} reason - Reason for skipping
   * @returns {Object} The log entry
   */
  markSkipped(medicationId, scheduleId = null, reason = null) {
    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0]

    let logId
    if (scheduleId) {
      const existingLog = db.prepare(`
        SELECT id FROM medication_log
        WHERE medication_id = ? AND schedule_id = ? AND scheduled_date = ?
      `).get(medicationId, scheduleId, today)

      if (existingLog) {
        db.prepare(`
          UPDATE medication_log SET status = 'skipped', notes = COALESCE(?, notes)
          WHERE id = ?
        `).run(reason, existingLog.id)
        logId = existingLog.id
      } else {
        const schedule = db.prepare('SELECT schedule_time FROM medication_schedules WHERE id = ?').get(scheduleId)
        const result = db.prepare(`
          INSERT INTO medication_log (medication_id, schedule_id, scheduled_date, scheduled_time, status, notes)
          VALUES (?, ?, ?, ?, 'skipped', ?)
        `).run(medicationId, scheduleId, today, schedule?.schedule_time, reason)
        logId = result.lastInsertRowid
      }
    } else {
      const result = db.prepare(`
        INSERT INTO medication_log (medication_id, scheduled_date, status, notes)
        VALUES (?, ?, 'skipped', ?)
      `).run(medicationId, today, reason)
      logId = result.lastInsertRowid
    }

    return db.prepare('SELECT * FROM medication_log WHERE id = ?').get(logId)
  },

  /**
   * Get adherence statistics for past N days
   * @param {number} userId - User ID
   * @param {number} days - Number of days to look back (default 7)
   * @returns {Object} Adherence statistics
   */
  getAdherenceStats(userId, days = 7) {
    const db = getDatabase()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = new Date().toISOString().split('T')[0]

    // Get all logs for the period
    const logs = db.prepare(`
      SELECT ml.*, m.name as medication_name
      FROM medication_log ml
      JOIN medications m ON ml.medication_id = m.id
      WHERE m.user_id = ?
        AND ml.scheduled_date >= ?
        AND ml.scheduled_date <= ?
    `).all(userId, startDateStr, endDateStr)

    const taken = logs.filter(l => l.status === 'taken').length
    const skipped = logs.filter(l => l.status === 'skipped').length
    const late = logs.filter(l => l.status === 'late').length
    const pending = logs.filter(l => l.status === 'pending').length
    const total = logs.length

    // Group by day
    const byDay = {}
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      byDay[dateStr] = { taken: 0, skipped: 0, late: 0, pending: 0, total: 0 }
    }

    for (const log of logs) {
      if (byDay[log.scheduled_date]) {
        byDay[log.scheduled_date][log.status]++
        byDay[log.scheduled_date].total++
      }
    }

    return {
      period: { start: startDateStr, end: endDateStr, days },
      summary: {
        total,
        taken,
        skipped,
        late,
        pending,
        adherence_rate: total > 0 ? Math.round((taken / total) * 100) : 100
      },
      by_day: Object.entries(byDay).map(([date, stats]) => ({
        date,
        ...stats,
        adherence_rate: stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 100
      })).sort((a, b) => a.date.localeCompare(b.date))
    }
  }
}

// Export the database instance getter as default
export default {
  init: initDatabase,
  get: getDatabase,
  close: closeDatabase,
  isConnected: isDatabaseConnected,
  WorkoutRepo,
  MedicationRepo
}
