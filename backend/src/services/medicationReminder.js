/**
 * Medication Reminder Service
 *
 * Runs every minute to check for upcoming and overdue medications.
 * - Sends reminders for medications due within 5 minutes
 * - Marks medications as 'late' if 30+ minutes overdue
 * - Creates alerts in the database
 * - Emits WebSocket events for real-time notifications
 *
 * Enable/disable via MEDICATION_REMINDERS_ENABLED environment variable
 */

import { EventEmitter } from 'events'
import { getDatabase } from './database.js'

const REMINDER_INTERVAL_MS = 60 * 1000 // 1 minute
const REMINDER_WINDOW_MINUTES = 5 // Remind when within 5 minutes of scheduled time
const LATE_THRESHOLD_MINUTES = 30 // Mark as late after 30 minutes

/**
 * Get local date string in YYYY-MM-DD format (uses local timezone, not UTC)
 */
function getLocalDateString(date = new Date()) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0')
}

class MedicationReminderService extends EventEmitter {
  constructor() {
    super()
    this.intervalId = null
    this.enabled = process.env.MEDICATION_REMINDERS_ENABLED !== 'false'
    this.sentReminders = new Map() // Track sent reminders to avoid duplicates: scheduleId_date -> timestamp
    this.debugMode = process.env.NODE_ENV === 'development'
  }

  /**
   * Start the reminder service
   */
  start() {
    if (!this.enabled) {
      console.log('💊 Medication reminders are disabled (MEDICATION_REMINDERS_ENABLED=false)')
      return
    }

    if (this.intervalId) {
      console.log('💊 Medication reminder service already running')
      return
    }

    console.log('💊 Starting medication reminder service')
    console.log(`   Reminder window: ${REMINDER_WINDOW_MINUTES} minutes before scheduled time`)
    console.log(`   Late threshold: ${LATE_THRESHOLD_MINUTES} minutes after scheduled time`)
    console.log(`   Check interval: ${REMINDER_INTERVAL_MS / 1000} seconds`)

    // Run immediately on start
    this.checkMedications()

    // Then run every minute
    this.intervalId = setInterval(() => {
      this.checkMedications()
    }, REMINDER_INTERVAL_MS)
  }

  /**
   * Stop the reminder service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('💊 Medication reminder service stopped')
    }
  }

  /**
   * Enable or disable the service
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled
    if (enabled && !this.intervalId) {
      this.start()
    } else if (!enabled && this.intervalId) {
      this.stop()
    }
  }

  /**
   * Main check function - runs every minute
   */
  checkMedications() {
    try {
      const db = getDatabase()
      const now = new Date()
      const today = getLocalDateString(now)
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentTimeMinutes = currentHour * 60 + currentMinute
      const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]

      if (this.debugMode) {
        console.log(`💊 [${now.toLocaleTimeString()}] Checking medications...`)
      }

      // Get all scheduled medications for today that haven't been taken
      const query = `
        SELECT
          m.id as medication_id,
          m.user_id,
          m.name as medication_name,
          m.dosage,
          m.instructions,
          ms.id as schedule_id,
          ms.schedule_time,
          ml.id as log_id,
          ml.status
        FROM medications m
        JOIN medication_schedules ms ON m.id = ms.medication_id AND ms.is_active = 1
        LEFT JOIN medication_log ml ON m.id = ml.medication_id
          AND ml.schedule_id = ms.id
          AND ml.scheduled_date = ?
        WHERE m.is_active = 1
          AND (ms.days_of_week = 'daily' OR ms.days_of_week LIKE ?)
        ORDER BY ms.schedule_time
      `

      const medications = db.prepare(query).all(today, `%${dayOfWeek}%`)

      let remindersCreated = 0
      let lateMarked = 0

      for (const med of medications) {
        const [schedHour, schedMinute] = med.schedule_time.split(':').map(Number)
        const scheduledTimeMinutes = schedHour * 60 + schedMinute
        const minutesUntil = scheduledTimeMinutes - currentTimeMinutes
        const minutesPast = currentTimeMinutes - scheduledTimeMinutes

        // Already taken or skipped - skip
        if (med.status === 'taken' || med.status === 'skipped') {
          continue
        }

        // Check if we need to send an upcoming reminder (within REMINDER_WINDOW_MINUTES)
        if (minutesUntil > 0 && minutesUntil <= REMINDER_WINDOW_MINUTES) {
          const reminderKey = `${med.schedule_id}_${today}_reminder`

          if (!this.sentReminders.has(reminderKey)) {
            this.createReminder(med, minutesUntil)
            this.sentReminders.set(reminderKey, Date.now())
            remindersCreated++
          }
        }

        // Check if medication is now due (at scheduled time)
        if (minutesUntil === 0) {
          const dueKey = `${med.schedule_id}_${today}_due`

          if (!this.sentReminders.has(dueKey)) {
            this.createDueAlert(med)
            this.sentReminders.set(dueKey, Date.now())
            remindersCreated++
          }
        }

        // Check if medication is late (past threshold)
        if (minutesPast >= LATE_THRESHOLD_MINUTES) {
          // Only mark as late if not already logged or if status is still pending
          if (!med.log_id || med.status === 'pending') {
            this.markAsLate(med, today)
            lateMarked++
          }
        }
      }

      // Clean up old reminder tracking (older than 24 hours)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
      for (const [key, timestamp] of this.sentReminders) {
        if (timestamp < oneDayAgo) {
          this.sentReminders.delete(key)
        }
      }

      if (this.debugMode && (remindersCreated > 0 || lateMarked > 0)) {
        console.log(`💊 Processed: ${remindersCreated} reminders created, ${lateMarked} marked late`)
      }

    } catch (error) {
      console.error('💊 Error checking medications:', error.message)
      this.emit('error', { type: 'check_error', error: error.message })
    }
  }

  /**
   * Create an upcoming reminder
   * @param {Object} med - Medication data
   * @param {number} minutesUntil - Minutes until scheduled time
   */
  createReminder(med, minutesUntil) {
    try {
      const db = getDatabase()

      const title = `Medication Due Soon: ${med.medication_name}`
      const message = minutesUntil === 1
        ? `${med.medication_name} is due in 1 minute`
        : `${med.medication_name} is due in ${minutesUntil} minutes`

      // Insert alert into database
      const alertStmt = db.prepare(`
        INSERT INTO alerts (user_id, alert_type, severity, title, message, source)
        VALUES (?, 'medication_reminder', 'info', ?, ?, 'medication_reminder_service')
      `)
      const result = alertStmt.run(med.user_id, title, message)

      if (this.debugMode) {
        console.log(`💊 Reminder: ${med.medication_name} in ${minutesUntil} minutes`)
      }

      // Emit WebSocket event
      this.emit('medication-reminder', {
        type: 'medication-reminder',
        alertId: result.lastInsertRowid,
        medicationId: med.medication_id,
        medicationName: med.medication_name,
        dosage: med.dosage,
        instructions: med.instructions,
        scheduledTime: med.schedule_time,
        scheduleId: med.schedule_id,
        minutesUntil,
        severity: 'info',
        message,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('💊 Error creating reminder:', error.message)
    }
  }

  /**
   * Create a "medication due now" alert
   * @param {Object} med - Medication data
   */
  createDueAlert(med) {
    try {
      const db = getDatabase()

      const title = `Time to Take: ${med.medication_name}`
      const message = med.dosage
        ? `Take ${med.dosage} of ${med.medication_name} now`
        : `Take ${med.medication_name} now`

      // Insert alert into database
      const alertStmt = db.prepare(`
        INSERT INTO alerts (user_id, alert_type, severity, title, message, source)
        VALUES (?, 'medication_reminder', 'warning', ?, ?, 'medication_reminder_service')
      `)
      const result = alertStmt.run(med.user_id, title, message)

      if (this.debugMode) {
        console.log(`💊 Due now: ${med.medication_name}`)
      }

      // Emit WebSocket event
      this.emit('medication-due', {
        type: 'medication-due',
        alertId: result.lastInsertRowid,
        medicationId: med.medication_id,
        medicationName: med.medication_name,
        dosage: med.dosage,
        instructions: med.instructions,
        scheduledTime: med.schedule_time,
        scheduleId: med.schedule_id,
        severity: 'warning',
        message,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('💊 Error creating due alert:', error.message)
    }
  }

  /**
   * Mark a medication as late and create warning alert
   * @param {Object} med - Medication data
   * @param {string} today - Today's date (YYYY-MM-DD)
   */
  markAsLate(med, today) {
    try {
      const db = getDatabase()

      // Check if we already have a log entry for this
      const existingLog = db.prepare(`
        SELECT id, status FROM medication_log
        WHERE medication_id = ? AND schedule_id = ? AND scheduled_date = ?
      `).get(med.medication_id, med.schedule_id, today)

      if (existingLog) {
        // Update existing log to 'late' if it's still pending
        if (existingLog.status === 'pending') {
          db.prepare(`
            UPDATE medication_log SET status = 'late' WHERE id = ?
          `).run(existingLog.id)
        }
      } else {
        // Create new log entry with 'late' status
        db.prepare(`
          INSERT INTO medication_log (medication_id, schedule_id, scheduled_date, scheduled_time, status)
          VALUES (?, ?, ?, ?, 'late')
        `).run(med.medication_id, med.schedule_id, today, med.schedule_time)
      }

      // Create warning alert
      const title = `Overdue Medication: ${med.medication_name}`
      const message = `${med.medication_name} was scheduled for ${this.formatTime(med.schedule_time)} and has not been taken`

      const alertStmt = db.prepare(`
        INSERT INTO alerts (user_id, alert_type, severity, title, message, source)
        VALUES (?, 'medication_reminder', 'warning', ?, ?, 'medication_reminder_service')
      `)
      const result = alertStmt.run(med.user_id, title, message)

      // Only emit late event once per medication per day
      const lateKey = `${med.schedule_id}_${today}_late`
      if (!this.sentReminders.has(lateKey)) {
        this.sentReminders.set(lateKey, Date.now())

        if (this.debugMode) {
          console.log(`💊 Late: ${med.medication_name} (scheduled ${med.schedule_time})`)
        }

        // Emit WebSocket event
        this.emit('medication-late', {
          type: 'medication-late',
          alertId: result.lastInsertRowid,
          medicationId: med.medication_id,
          medicationName: med.medication_name,
          dosage: med.dosage,
          scheduledTime: med.schedule_time,
          scheduleId: med.schedule_id,
          severity: 'warning',
          message,
          timestamp: new Date().toISOString()
        })
      }

    } catch (error) {
      console.error('💊 Error marking medication as late:', error.message)
    }
  }

  /**
   * Format time from 24h to 12h format
   * @param {string} time - Time in HH:MM format
   * @returns {string} Time in 12h format
   */
  formatTime(time) {
    const [hour, minute] = time.split(':').map(Number)
    const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`
  }

  /**
   * Get current status for debugging
   * @returns {Object} Current service status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      running: this.intervalId !== null,
      reminderWindow: REMINDER_WINDOW_MINUTES,
      lateThreshold: LATE_THRESHOLD_MINUTES,
      trackedReminders: this.sentReminders.size
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stop()
    this.sentReminders.clear()
    this.removeAllListeners()
    console.log('💊 Medication reminder service destroyed')
  }
}

// Export singleton instance
const medicationReminder = new MedicationReminderService()
export default medicationReminder
