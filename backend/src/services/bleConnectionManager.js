import { EventEmitter } from 'events'
import BleDevicesRepo from '../repos/BleDevicesRepo.js'
import bleScanner from './bleScanner.js'
import bleHealthProcessor from './bleHealthProcessor.js'

/**
 * BLE Connection Manager
 *
 * Background service that:
 * - Polls every 15 seconds for paired devices
 * - Attempts to connect to paired devices in range
 * - Subscribes to blood pressure characteristics
 * - Processes notifications and stores vitals
 * - Emits connection status events
 */

// Standard BLE GATT Service and Characteristic UUIDs
const BLE_SERVICES = {
  BLOOD_PRESSURE: '1810'
}

const BLE_CHARACTERISTICS = {
  BLOOD_PRESSURE_MEASUREMENT: '2a35'
}

class BLEConnectionManager extends EventEmitter {
  constructor() {
    super()

    this.pollingInterval = null
    this.pollingIntervalMs = 15000 // 15 seconds
    this.connectedPeripherals = new Map() // MAC -> { peripheral, characteristics, name }
    this.connectionAttempts = new Map() // MAC -> retry count
    this.maxReconnectAttempts = 20

    console.log('[BLEConnectionManager] Initialized')
  }

  /**
   * Start the polling loop
   */
  start() {
    if (this.pollingInterval) {
      console.log('[BLEConnectionManager] Already running')
      return
    }

    console.log(`[BLEConnectionManager] Starting with ${this.pollingIntervalMs}ms interval`)

    // Initial poll
    this.poll()

    // Set up interval
    this.pollingInterval = setInterval(() => {
      this.poll()
    }, this.pollingIntervalMs)
  }

  /**
   * Stop the polling loop and disconnect all devices
   */
  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }

    // Disconnect all connected devices
    for (const [mac] of this.connectedPeripherals) {
      this.disconnectDevice(mac)
    }

    console.log('[BLEConnectionManager] Stopped')
  }

  /**
   * Poll for paired devices and attempt connections
   */
  async poll() {
    try {
      console.log('[BLEConnectionManager] Polling for paired devices...')

      // Get all paired blood pressure devices
      const pairedDevices = BleDevicesRepo.findPaired('blood_pressure')

      if (pairedDevices.length === 0) {
        console.log('[BLEConnectionManager] No paired devices found')
        return
      }

      console.log(`[BLEConnectionManager] Found ${pairedDevices.length} paired device(s)`)

      for (const device of pairedDevices) {
        const { macAddress, name } = device

        // Skip if already connected
        if (this.connectedPeripherals.has(macAddress)) {
          console.log(`[BLEConnectionManager] ${name} (${macAddress}) already connected`)
          continue
        }

        // Check connection attempt count
        const attempts = this.connectionAttempts.get(macAddress) || 0
        if (attempts >= this.maxReconnectAttempts) {
          console.log(`[BLEConnectionManager] ${name} (${macAddress}) max connection attempts reached`)
          continue
        }

        // Try to connect
        await this.connectToDevice(macAddress, name)
      }
    } catch (error) {
      console.error('[BLEConnectionManager] Error in poll:', error)
    }
  }

  /**
   * Connect to a BLE device
   */
  async connectToDevice(macAddress, name = 'Unknown Device') {
    try {
      console.log(`[BLEConnectionManager] Attempting to connect to ${name} (${macAddress})...`)

      // Increment connection attempt counter
      const attempts = (this.connectionAttempts.get(macAddress) || 0) + 1
      this.connectionAttempts.set(macAddress, attempts)

      // Emit connecting status
      this.emit('connection-status', {
        macAddress,
        name,
        status: 'connecting'
      })

      // Get peripheral from scanner cache
      const peripheral = bleScanner.getPeripheralByMac(macAddress)
      if (!peripheral) {
        throw new Error('Device not in range (not found in scanner cache)')
      }

      // Connect to peripheral
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, 10000) // 10 second timeout

        peripheral.connect((error) => {
          clearTimeout(timeout)
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })

      console.log(`[BLEConnectionManager] Connected to ${name}`)

      // Discover services and characteristics
      await this.discoverServices(peripheral, macAddress, name)

      // Store connection
      this.connectedPeripherals.set(macAddress, {
        peripheral,
        name,
        connectedAt: new Date().toISOString()
      })

      // Reset connection attempts on successful connection
      this.connectionAttempts.delete(macAddress)

      // Update database
      BleDevicesRepo.updateLastSeen(macAddress)

      // Emit connected status
      this.emit('connection-status', {
        macAddress,
        name,
        status: 'connected'
      })

      // Handle disconnect events
      peripheral.once('disconnect', () => {
        console.log(`[BLEConnectionManager] ${name} disconnected`)
        this.connectedPeripherals.delete(macAddress)

        this.emit('connection-status', {
          macAddress,
          name,
          status: 'disconnected'
        })
      })

    } catch (error) {
      console.error(`[BLEConnectionManager] Failed to connect to ${name}:`, error.message)

      this.emit('connection-error', {
        macAddress,
        name,
        error: error.message
      })

      this.emit('connection-status', {
        macAddress,
        name,
        status: 'disconnected'
      })
    }
  }

  /**
   * Discover services and characteristics, then subscribe
   */
  async discoverServices(peripheral, macAddress, name) {
    return new Promise((resolve, reject) => {
      console.log(`[BLEConnectionManager] Discovering services for ${name}...`)

      peripheral.discoverServices([BLE_SERVICES.BLOOD_PRESSURE], (error, services) => {
        if (error) {
          return reject(new Error('Service discovery failed: ' + error.message))
        }

        if (!services || services.length === 0) {
          return reject(new Error('Blood pressure service not found'))
        }

        const service = services[0]
        console.log(`[BLEConnectionManager] Found blood pressure service on ${name}`)

        // Discover characteristics
        service.discoverCharacteristics([BLE_CHARACTERISTICS.BLOOD_PRESSURE_MEASUREMENT], (error, characteristics) => {
          if (error) {
            return reject(new Error('Characteristic discovery failed: ' + error.message))
          }

          if (!characteristics || characteristics.length === 0) {
            return reject(new Error('Blood pressure measurement characteristic not found'))
          }

          const characteristic = characteristics[0]
          console.log(`[BLEConnectionManager] Found BP characteristic on ${name}`)

          // Subscribe to notifications
          characteristic.subscribe((error) => {
            if (error) {
              return reject(new Error('Failed to subscribe: ' + error.message))
            }

            console.log(`[BLEConnectionManager] ✓ Subscribed to BP notifications for ${name}`)

            // Handle data notifications
            characteristic.on('data', (data) => {
              this.handleBloodPressureNotification(macAddress, name, data)
            })

            resolve()
          })
        })
      })
    })
  }

  /**
   * Handle blood pressure notification data
   */
  handleBloodPressureNotification(macAddress, name, data) {
    try {
      console.log(`[BLEConnectionManager] Received BP data from ${name}`)

      // Parse the data using bleHealthProcessor
      const parsed = bleHealthProcessor.parseBloodPressureMeasurement(data)

      if (!parsed) {
        console.error('[BLEConnectionManager] Failed to parse BP data')
        return
      }

      const { systolic, diastolic, unit } = parsed
      console.log(`[BLEConnectionManager] Parsed: ${systolic}/${diastolic} ${unit}`)

      // Emit event
      this.emit('bp-data-received', {
        macAddress,
        name,
        systolic,
        diastolic,
        unit
      })

      // Process and store the reading (this will trigger WebSocket broadcast)
      bleHealthProcessor.processBloodPressure(macAddress, systolic, diastolic, {
        unit,
        source: `ble_${macAddress}`,
        deviceName: name
      })

      console.log(`[BLEConnectionManager] ✓ Blood pressure reading stored: ${systolic}/${diastolic} ${unit}`)

    } catch (error) {
      console.error('[BLEConnectionManager] Error handling BP notification:', error)
    }
  }

  /**
   * Manually disconnect a device
   */
  async disconnectDevice(macAddress) {
    const connection = this.connectedPeripherals.get(macAddress)
    if (!connection) {
      console.log(`[BLEConnectionManager] Device ${macAddress} not connected`)
      return
    }

    const { peripheral, name } = connection

    return new Promise((resolve) => {
      peripheral.disconnect(() => {
        console.log(`[BLEConnectionManager] Disconnected ${name}`)
        this.connectedPeripherals.delete(macAddress)

        this.emit('connection-status', {
          macAddress,
          name,
          status: 'disconnected'
        })

        resolve()
      })
    })
  }

  /**
   * Get current connection status
   */
  getStatus() {
    const connections = []

    for (const [mac, conn] of this.connectedPeripherals) {
      connections.push({
        macAddress: mac,
        name: conn.name,
        status: 'connected',
        connectedAt: conn.connectedAt
      })
    }

    return {
      isRunning: this.pollingInterval !== null,
      pollingIntervalMs: this.pollingIntervalMs,
      connectedCount: this.connectedPeripherals.size,
      connections
    }
  }

  /**
   * Check if a device is connected
   */
  isConnected(macAddress) {
    return this.connectedPeripherals.has(macAddress)
  }
}

// Export singleton instance
const bleConnectionManager = new BLEConnectionManager()
export default bleConnectionManager
