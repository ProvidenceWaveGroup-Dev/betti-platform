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

// Export the database instance getter as default
export default {
  init: initDatabase,
  get: getDatabase,
  close: closeDatabase,
  isConnected: isDatabaseConnected
}
