import { getDatabase } from '../services/database.js'

// Valid device types
const VALID_DEVICE_TYPES = [
  'blood_pressure',
  'heart_rate',
  'scale',
  'glucose',
  'thermometer',
  'unknown'
]

// Default user ID (single-user mode)
const DEFAULT_USER_ID = 1

class BleDevicesRepo {
  get db() {
    return getDatabase()
  }

  /**
   * Normalize MAC address to lowercase without separators
   * A1:B2:C3:D4:E5:F6 → a1b2c3d4e5f6
   */
  static normalizeMAC(macAddress) {
    if (!macAddress) return null
    return macAddress.replace(/[:-]/g, '').toLowerCase()
  }

  /**
   * Create or update a BLE device
   */
  create({ macAddress, name = null, deviceType = 'unknown', manufacturer = null }) {
    if (!macAddress) {
      throw new Error('macAddress is required')
    }

    const macNormalized = BleDevicesRepo.normalizeMAC(macAddress)
    const now = new Date().toISOString()

    // Check if device already exists
    const existing = this.findByMac(macAddress)
    if (existing) {
      // Update existing device
      const stmt = this.db.prepare(`
        UPDATE ble_devices
        SET name = COALESCE(?, name),
            device_type = COALESCE(?, device_type),
            manufacturer = COALESCE(?, manufacturer),
            last_seen = ?,
            updated_at = ?
        WHERE mac_normalized = ?
      `)

      stmt.run(name, deviceType, manufacturer, now, now, macNormalized)
      return this.findByMac(macAddress)
    }

    // Insert new device
    const stmt = this.db.prepare(`
      INSERT INTO ble_devices (
        mac_address,
        mac_normalized,
        name,
        device_type,
        manufacturer,
        assigned_user,
        last_seen
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      macAddress,
      macNormalized,
      name,
      deviceType,
      manufacturer,
      DEFAULT_USER_ID,
      now
    )

    return this.findById(result.lastInsertRowid)
  }

  /**
   * Find device by ID
   */
  findById(id) {
    const stmt = this.db.prepare(`
      SELECT * FROM ble_devices WHERE id = ?
    `)

    const row = stmt.get(id)
    if (!row) return null

    return this.formatRow(row)
  }

  /**
   * Find device by MAC address
   */
  findByMac(macAddress) {
    const macNormalized = BleDevicesRepo.normalizeMAC(macAddress)
    if (!macNormalized) return null

    const stmt = this.db.prepare(`
      SELECT * FROM ble_devices WHERE mac_normalized = ?
    `)

    const row = stmt.get(macNormalized)
    if (!row) return null

    return this.formatRow(row)
  }

  /**
   * Find all devices
   */
  findAll() {
    const stmt = this.db.prepare(`
      SELECT * FROM ble_devices ORDER BY last_seen DESC
    `)

    const rows = stmt.all()
    return rows.map(row => this.formatRow(row))
  }

  /**
   * Find paired devices
   */
  findPaired(deviceType = null) {
    let sql = `SELECT * FROM ble_devices WHERE is_paired = 1`
    const params = []

    if (deviceType) {
      sql += ' AND device_type = ?'
      params.push(deviceType)
    }

    sql += ' ORDER BY last_seen DESC'

    const stmt = this.db.prepare(sql)
    const rows = stmt.all(...params)
    return rows.map(row => this.formatRow(row))
  }

  /**
   * Set paired status
   */
  setPaired(macAddress, isPaired = true) {
    const macNormalized = BleDevicesRepo.normalizeMAC(macAddress)
    if (!macNormalized) {
      throw new Error('Invalid MAC address')
    }

    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE ble_devices
      SET is_paired = ?,
          updated_at = ?
      WHERE mac_normalized = ?
    `)

    const result = stmt.run(isPaired ? 1 : 0, now, macNormalized)

    if (result.changes === 0) {
      throw new Error('Device not found')
    }

    return this.findByMac(macAddress)
  }

  /**
   * Set trusted status
   */
  setTrusted(macAddress, isTrusted = true) {
    const macNormalized = BleDevicesRepo.normalizeMAC(macAddress)
    if (!macNormalized) {
      throw new Error('Invalid MAC address')
    }

    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE ble_devices
      SET is_trusted = ?,
          updated_at = ?
      WHERE mac_normalized = ?
    `)

    const result = stmt.run(isTrusted ? 1 : 0, now, macNormalized)

    if (result.changes === 0) {
      throw new Error('Device not found')
    }

    return this.findByMac(macAddress)
  }

  /**
   * Unpair all devices of a given type
   * Used to enforce single-device constraint
   */
  unpairAll(deviceType = 'blood_pressure') {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE ble_devices
      SET is_paired = 0,
          is_trusted = 0,
          updated_at = ?
      WHERE device_type = ? AND is_paired = 1
    `)

    const result = stmt.run(now, deviceType)
    return result.changes
  }

  /**
   * Update last seen timestamp and RSSI
   */
  updateLastSeen(macAddress, rssi = null) {
    const macNormalized = BleDevicesRepo.normalizeMAC(macAddress)
    if (!macNormalized) return null

    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE ble_devices
      SET last_seen = ?,
          last_rssi = ?,
          updated_at = ?
      WHERE mac_normalized = ?
    `)

    stmt.run(now, rssi, now, macNormalized)
    return this.findByMac(macAddress)
  }

  /**
   * Update device configuration
   */
  updateConfig(macAddress, config) {
    const macNormalized = BleDevicesRepo.normalizeMAC(macAddress)
    if (!macNormalized) {
      throw new Error('Invalid MAC address')
    }

    const now = new Date().toISOString()
    const configJson = JSON.stringify(config)

    const stmt = this.db.prepare(`
      UPDATE ble_devices
      SET config_json = ?,
          updated_at = ?
      WHERE mac_normalized = ?
    `)

    const result = stmt.run(configJson, now, macNormalized)

    if (result.changes === 0) {
      throw new Error('Device not found')
    }

    return this.findByMac(macAddress)
  }

  /**
   * Delete a device
   */
  delete(macAddress) {
    const macNormalized = BleDevicesRepo.normalizeMAC(macAddress)
    if (!macNormalized) {
      throw new Error('Invalid MAC address')
    }

    const stmt = this.db.prepare(`
      DELETE FROM ble_devices WHERE mac_normalized = ?
    `)

    const result = stmt.run(macNormalized)
    return result.changes > 0
  }

  /**
   * Format database row to camelCase API format
   */
  formatRow(row) {
    if (!row) return null

    return {
      id: row.id,
      macAddress: row.mac_address,
      macNormalized: row.mac_normalized,
      name: row.name,
      deviceType: row.device_type,
      manufacturer: row.manufacturer,
      isPaired: Boolean(row.is_paired),
      isTrusted: Boolean(row.is_trusted),
      assignedUser: row.assigned_user,
      lastRssi: row.last_rssi,
      lastSeen: row.last_seen,
      config: row.config_json ? JSON.parse(row.config_json) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}

// Export singleton instance
export default new BleDevicesRepo()
