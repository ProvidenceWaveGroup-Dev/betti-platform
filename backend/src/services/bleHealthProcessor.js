import { EventEmitter } from 'events'
import VitalsRepo from '../repos/VitalsRepo.js'

/**
 * BLE Health Data Processor
 *
 * Processes incoming health data from BLE devices and stores vitals.
 * Handles debouncing to prevent duplicate readings from devices that
 * send data rapidly.
 *
 * Supported device types:
 * - Heart Rate Monitors (HR)
 * - Blood Pressure Cuffs (BP systolic/diastolic)
 * - Pulse Oximeters (SpO2, HR)
 * - Smart Scales (weight)
 *
 * Standard BLE Health Device Service UUIDs:
 * - Heart Rate: 0x180D
 * - Blood Pressure: 0x1810
 * - Weight Scale: 0x181D
 * - Pulse Oximeter: 0x1822 (or proprietary)
 */

// Standard BLE GATT Service UUIDs for health devices
const BLE_SERVICES = {
  HEART_RATE: '180d',
  BLOOD_PRESSURE: '1810',
  WEIGHT_SCALE: '181d',
  PULSE_OXIMETER: '1822',
  HEALTH_THERMOMETER: '1809'
}

// Characteristic UUIDs
const BLE_CHARACTERISTICS = {
  HEART_RATE_MEASUREMENT: '2a37',
  BLOOD_PRESSURE_MEASUREMENT: '2a35',
  WEIGHT_MEASUREMENT: '2a9d',
  TEMPERATURE_MEASUREMENT: '2a1c',
  PLX_SPOT_CHECK: '2a5e',        // Pulse Oximeter spot check
  PLX_CONTINUOUS: '2a5f'         // Pulse Oximeter continuous
}

// Debounce window in milliseconds
const DEBOUNCE_WINDOW_MS = 5000

class BLEHealthProcessor extends EventEmitter {
  constructor() {
    super()

    // Track recent readings for debouncing
    // Key: `${deviceAddress}_${vitalType}`, Value: { timestamp, reading }
    this.recentReadings = new Map()

    // Registered device addresses and their types
    // Key: deviceAddress, Value: { name, type, lastSeen }
    this.knownDevices = new Map()

    // Cleanup interval for stale readings
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleReadings()
    }, 30000) // Run every 30 seconds

    console.log('[BLEHealthProcessor] Initialized')
  }

  /**
   * Register a known health device
   * @param {string} address - Device MAC address
   * @param {string} name - Device name
   * @param {string} type - Device type: 'heart_rate_monitor', 'blood_pressure_cuff', 'pulse_oximeter', 'scale', 'thermometer'
   */
  registerDevice(address, name, type) {
    const normalizedAddress = address.toUpperCase()
    this.knownDevices.set(normalizedAddress, {
      name,
      type,
      registeredAt: new Date().toISOString(),
      lastSeen: null
    })
    console.log(`[BLEHealthProcessor] Registered device: ${name} (${normalizedAddress}) as ${type}`)
  }

  /**
   * Unregister a device
   * @param {string} address - Device MAC address
   */
  unregisterDevice(address) {
    const normalizedAddress = address.toUpperCase()
    this.knownDevices.delete(normalizedAddress)
    console.log(`[BLEHealthProcessor] Unregistered device: ${normalizedAddress}`)
  }

  /**
   * Get all registered devices
   * @returns {Array} List of registered devices
   */
  getRegisteredDevices() {
    return Array.from(this.knownDevices.entries()).map(([address, info]) => ({
      address,
      ...info
    }))
  }

  /**
   * Check if a reading should be processed or debounced
   * @param {string} deviceAddress - Device MAC address
   * @param {string} vitalType - Type of vital
   * @param {object} reading - The reading data
   * @returns {boolean} True if reading should be processed
   */
  shouldProcessReading(deviceAddress, vitalType, reading) {
    const key = `${deviceAddress}_${vitalType}`
    const now = Date.now()

    const recent = this.recentReadings.get(key)

    if (recent) {
      const timeSinceLastReading = now - recent.timestamp

      // If within debounce window, check if values are the same
      if (timeSinceLastReading < DEBOUNCE_WINDOW_MS) {
        // For blood pressure, compare both values
        if (vitalType === 'blood_pressure') {
          if (recent.reading.systolic === reading.systolic &&
              recent.reading.diastolic === reading.diastolic) {
            console.log(`[BLEHealthProcessor] Debounced duplicate ${vitalType} reading from ${deviceAddress}`)
            return false
          }
        } else {
          // For single-value vitals
          if (recent.reading.value === reading.value) {
            console.log(`[BLEHealthProcessor] Debounced duplicate ${vitalType} reading from ${deviceAddress}`)
            return false
          }
        }
      }
    }

    // Store this reading for future debounce checks
    this.recentReadings.set(key, {
      timestamp: now,
      reading
    })

    return true
  }

  /**
   * Clean up stale readings older than debounce window
   */
  cleanupStaleReadings() {
    const now = Date.now()
    let cleaned = 0

    for (const [key, data] of this.recentReadings.entries()) {
      if (now - data.timestamp > DEBOUNCE_WINDOW_MS * 2) {
        this.recentReadings.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`[BLEHealthProcessor] Cleaned up ${cleaned} stale readings`)
    }
  }

  /**
   * Process heart rate data from a BLE heart rate monitor
   * @param {string} deviceAddress - Device MAC address
   * @param {number} heartRate - Heart rate in BPM
   * @param {object} options - Additional options
   */
  async processHeartRate(deviceAddress, heartRate, options = {}) {
    const reading = { value: heartRate }

    if (!this.shouldProcessReading(deviceAddress, 'heart_rate', reading)) {
      return null
    }

    try {
      const vital = VitalsRepo.create({
        vitalType: 'heart_rate',
        valuePrimary: heartRate,
        unit: 'bpm',
        source: deviceAddress,
        notes: options.notes || `From BLE device: ${options.deviceName || deviceAddress}`
      })

      console.log(`[BLEHealthProcessor] Stored heart rate: ${heartRate} bpm from ${deviceAddress}`)

      // Update device last seen
      this.updateDeviceLastSeen(deviceAddress)

      // Emit event for WebSocket broadcast
      this.emit('vitalRecorded', {
        vitalType: 'heart_rate',
        vital,
        deviceAddress
      })

      return vital
    } catch (error) {
      console.error(`[BLEHealthProcessor] Error storing heart rate:`, error)
      this.emit('error', { type: 'heart_rate', deviceAddress, error: error.message })
      return null
    }
  }

  /**
   * Process blood pressure data from a BLE blood pressure cuff
   * @param {string} deviceAddress - Device MAC address
   * @param {number} systolic - Systolic pressure in mmHg
   * @param {number} diastolic - Diastolic pressure in mmHg
   * @param {object} options - Additional options (pulseRate, etc.)
   */
  async processBloodPressure(deviceAddress, systolic, diastolic, options = {}) {
    const reading = { systolic, diastolic }

    if (!this.shouldProcessReading(deviceAddress, 'blood_pressure', reading)) {
      return null
    }

    try {
      const vital = VitalsRepo.create({
        vitalType: 'blood_pressure',
        valuePrimary: systolic,
        valueSecondary: diastolic,
        unit: 'mmHg',
        source: deviceAddress,
        notes: options.notes || `From BLE device: ${options.deviceName || deviceAddress}`
      })

      console.log(`[BLEHealthProcessor] Stored blood pressure: ${systolic}/${diastolic} mmHg from ${deviceAddress}`)

      // Update device last seen
      this.updateDeviceLastSeen(deviceAddress)

      // Emit event for WebSocket broadcast
      this.emit('vitalRecorded', {
        vitalType: 'blood_pressure',
        vital,
        deviceAddress
      })

      // If pulse rate was also provided, store it separately
      if (options.pulseRate) {
        await this.processHeartRate(deviceAddress, options.pulseRate, {
          ...options,
          notes: `Pulse from BP measurement: ${options.deviceName || deviceAddress}`
        })
      }

      return vital
    } catch (error) {
      console.error(`[BLEHealthProcessor] Error storing blood pressure:`, error)
      this.emit('error', { type: 'blood_pressure', deviceAddress, error: error.message })
      return null
    }
  }

  /**
   * Process SpO2 data from a pulse oximeter
   * @param {string} deviceAddress - Device MAC address
   * @param {number} spo2 - Oxygen saturation percentage
   * @param {number} pulseRate - Optional pulse rate
   * @param {object} options - Additional options
   */
  async processSpO2(deviceAddress, spo2, pulseRate = null, options = {}) {
    const reading = { value: spo2 }

    if (!this.shouldProcessReading(deviceAddress, 'spo2', reading)) {
      return null
    }

    try {
      const vital = VitalsRepo.create({
        vitalType: 'spo2',
        valuePrimary: spo2,
        unit: '%',
        source: deviceAddress,
        notes: options.notes || `From BLE device: ${options.deviceName || deviceAddress}`
      })

      console.log(`[BLEHealthProcessor] Stored SpO2: ${spo2}% from ${deviceAddress}`)

      // Update device last seen
      this.updateDeviceLastSeen(deviceAddress)

      // Emit event for WebSocket broadcast
      this.emit('vitalRecorded', {
        vitalType: 'spo2',
        vital,
        deviceAddress
      })

      // If pulse rate was also provided, store it separately
      if (pulseRate) {
        await this.processHeartRate(deviceAddress, pulseRate, {
          ...options,
          notes: `Pulse from oximeter: ${options.deviceName || deviceAddress}`
        })
      }

      return vital
    } catch (error) {
      console.error(`[BLEHealthProcessor] Error storing SpO2:`, error)
      this.emit('error', { type: 'spo2', deviceAddress, error: error.message })
      return null
    }
  }

  /**
   * Process weight data from a smart scale
   * @param {string} deviceAddress - Device MAC address
   * @param {number} weight - Weight value
   * @param {string} unit - Weight unit ('lbs' or 'kg')
   * @param {object} options - Additional options
   */
  async processWeight(deviceAddress, weight, unit = 'lbs', options = {}) {
    const reading = { value: weight }

    if (!this.shouldProcessReading(deviceAddress, 'weight', reading)) {
      return null
    }

    try {
      const vital = VitalsRepo.create({
        vitalType: 'weight',
        valuePrimary: weight,
        unit: unit,
        source: deviceAddress,
        notes: options.notes || `From BLE device: ${options.deviceName || deviceAddress}`
      })

      console.log(`[BLEHealthProcessor] Stored weight: ${weight} ${unit} from ${deviceAddress}`)

      // Update device last seen
      this.updateDeviceLastSeen(deviceAddress)

      // Emit event for WebSocket broadcast
      this.emit('vitalRecorded', {
        vitalType: 'weight',
        vital,
        deviceAddress
      })

      return vital
    } catch (error) {
      console.error(`[BLEHealthProcessor] Error storing weight:`, error)
      this.emit('error', { type: 'weight', deviceAddress, error: error.message })
      return null
    }
  }

  /**
   * Process temperature data from a health thermometer
   * @param {string} deviceAddress - Device MAC address
   * @param {number} temperature - Temperature value
   * @param {string} unit - Temperature unit ('F' or 'C')
   * @param {object} options - Additional options
   */
  async processTemperature(deviceAddress, temperature, unit = 'F', options = {}) {
    // Convert Celsius to Fahrenheit if needed (our system uses Fahrenheit)
    let tempF = temperature
    if (unit === 'C') {
      tempF = (temperature * 9/5) + 32
    }

    const reading = { value: tempF }

    if (!this.shouldProcessReading(deviceAddress, 'temperature', reading)) {
      return null
    }

    try {
      const vital = VitalsRepo.create({
        vitalType: 'temperature',
        valuePrimary: parseFloat(tempF.toFixed(1)),
        unit: '°F',
        source: deviceAddress,
        notes: options.notes || `From BLE device: ${options.deviceName || deviceAddress}`
      })

      console.log(`[BLEHealthProcessor] Stored temperature: ${tempF.toFixed(1)}°F from ${deviceAddress}`)

      // Update device last seen
      this.updateDeviceLastSeen(deviceAddress)

      // Emit event for WebSocket broadcast
      this.emit('vitalRecorded', {
        vitalType: 'temperature',
        vital,
        deviceAddress
      })

      return vital
    } catch (error) {
      console.error(`[BLEHealthProcessor] Error storing temperature:`, error)
      this.emit('error', { type: 'temperature', deviceAddress, error: error.message })
      return null
    }
  }

  /**
   * Process glucose data from a glucose monitor
   * @param {string} deviceAddress - Device MAC address
   * @param {number} glucose - Glucose level in mg/dL
   * @param {object} options - Additional options
   */
  async processGlucose(deviceAddress, glucose, options = {}) {
    const reading = { value: glucose }

    if (!this.shouldProcessReading(deviceAddress, 'glucose', reading)) {
      return null
    }

    try {
      const vital = VitalsRepo.create({
        vitalType: 'glucose',
        valuePrimary: glucose,
        unit: 'mg/dL',
        source: deviceAddress,
        notes: options.notes || `From BLE device: ${options.deviceName || deviceAddress}`
      })

      console.log(`[BLEHealthProcessor] Stored glucose: ${glucose} mg/dL from ${deviceAddress}`)

      // Update device last seen
      this.updateDeviceLastSeen(deviceAddress)

      // Emit event for WebSocket broadcast
      this.emit('vitalRecorded', {
        vitalType: 'glucose',
        vital,
        deviceAddress
      })

      return vital
    } catch (error) {
      console.error(`[BLEHealthProcessor] Error storing glucose:`, error)
      this.emit('error', { type: 'glucose', deviceAddress, error: error.message })
      return null
    }
  }

  /**
   * Update last seen timestamp for a device
   * @param {string} deviceAddress - Device MAC address
   */
  updateDeviceLastSeen(deviceAddress) {
    const normalizedAddress = deviceAddress.toUpperCase()
    const device = this.knownDevices.get(normalizedAddress)
    if (device) {
      device.lastSeen = new Date().toISOString()
    }
  }

  /**
   * Parse raw BLE characteristic data based on service UUID
   * This is a placeholder for future implementation when actual BLE
   * devices are connected. Each manufacturer may have proprietary formats.
   *
   * @param {string} serviceUuid - BLE service UUID
   * @param {string} characteristicUuid - BLE characteristic UUID
   * @param {Buffer} data - Raw data buffer
   * @returns {object|null} Parsed data or null if unknown format
   */
  parseCharacteristicData(serviceUuid, characteristicUuid, data) {
    const service = serviceUuid.toLowerCase()
    const characteristic = characteristicUuid.toLowerCase()

    try {
      // Heart Rate Measurement (standard format)
      if (service === BLE_SERVICES.HEART_RATE &&
          characteristic === BLE_CHARACTERISTICS.HEART_RATE_MEASUREMENT) {
        return this.parseHeartRateMeasurement(data)
      }

      // Blood Pressure Measurement (standard format)
      if (service === BLE_SERVICES.BLOOD_PRESSURE &&
          characteristic === BLE_CHARACTERISTICS.BLOOD_PRESSURE_MEASUREMENT) {
        return this.parseBloodPressureMeasurement(data)
      }

      // Weight Measurement (standard format)
      if (service === BLE_SERVICES.WEIGHT_SCALE &&
          characteristic === BLE_CHARACTERISTICS.WEIGHT_MEASUREMENT) {
        return this.parseWeightMeasurement(data)
      }

      // Temperature Measurement (standard format)
      if (service === BLE_SERVICES.HEALTH_THERMOMETER &&
          characteristic === BLE_CHARACTERISTICS.TEMPERATURE_MEASUREMENT) {
        return this.parseTemperatureMeasurement(data)
      }

      console.log(`[BLEHealthProcessor] Unknown characteristic: ${service}/${characteristic}`)
      return null
    } catch (error) {
      console.error(`[BLEHealthProcessor] Error parsing characteristic data:`, error)
      return null
    }
  }

  /**
   * Parse standard BLE Heart Rate Measurement characteristic
   * @param {Buffer} data - Raw data buffer
   * @returns {object} Parsed heart rate data
   */
  parseHeartRateMeasurement(data) {
    const flags = data[0]
    const is16Bit = (flags & 0x01) !== 0

    let heartRate
    if (is16Bit) {
      heartRate = data.readUInt16LE(1)
    } else {
      heartRate = data[1]
    }

    return {
      type: 'heart_rate',
      heartRate,
      hasContactDetected: (flags & 0x02) !== 0,
      contactSupported: (flags & 0x04) !== 0
    }
  }

  /**
   * Parse standard BLE Blood Pressure Measurement characteristic
   * @param {Buffer} data - Raw data buffer
   * @returns {object} Parsed blood pressure data
   */
  parseBloodPressureMeasurement(data) {
    const flags = data[0]
    const isKPa = (flags & 0x01) !== 0 // 0 = mmHg, 1 = kPa

    // Values are in SFLOAT format (16-bit)
    let systolic = data.readInt16LE(1)
    let diastolic = data.readInt16LE(3)
    let meanAP = data.readInt16LE(5)

    // Convert kPa to mmHg if needed
    if (isKPa) {
      systolic = Math.round(systolic * 7.50062)
      diastolic = Math.round(diastolic * 7.50062)
      meanAP = Math.round(meanAP * 7.50062)
    }

    const result = {
      type: 'blood_pressure',
      systolic,
      diastolic,
      meanArterialPressure: meanAP,
      unit: 'mmHg'
    }

    // Check if pulse rate is included
    if ((flags & 0x04) !== 0) {
      result.pulseRate = data.readInt16LE(7)
    }

    return result
  }

  /**
   * Parse standard BLE Weight Measurement characteristic
   * @param {Buffer} data - Raw data buffer
   * @returns {object} Parsed weight data
   */
  parseWeightMeasurement(data) {
    const flags = data[0]
    const isImperial = (flags & 0x01) !== 0 // 0 = SI (kg), 1 = Imperial (lb)

    // Weight is in resolution of 0.005 kg or 0.01 lb
    let weight = data.readUInt16LE(1)
    let unit

    if (isImperial) {
      weight = weight * 0.01 // Convert to lbs
      unit = 'lbs'
    } else {
      weight = weight * 0.005 // Convert to kg
      unit = 'kg'
    }

    return {
      type: 'weight',
      weight: parseFloat(weight.toFixed(1)),
      unit
    }
  }

  /**
   * Parse standard BLE Temperature Measurement characteristic
   * @param {Buffer} data - Raw data buffer
   * @returns {object} Parsed temperature data
   */
  parseTemperatureMeasurement(data) {
    const flags = data[0]
    const isFahrenheit = (flags & 0x01) !== 0

    // Temperature is in IEEE 11073 FLOAT format
    // Simplified parsing - actual implementation may need full FLOAT parsing
    const mantissa = (data[1] | (data[2] << 8) | ((data[3] & 0x7F) << 16))
    const exponent = (data[3] >> 7) | ((data[4] & 0xFF) << 1)

    // Simplified: assume exponent is -1 (one decimal place)
    let temperature = mantissa / 10

    return {
      type: 'temperature',
      temperature: parseFloat(temperature.toFixed(1)),
      unit: isFahrenheit ? 'F' : 'C'
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.recentReadings.clear()
    this.knownDevices.clear()
    this.removeAllListeners()
    console.log('[BLEHealthProcessor] Destroyed')
  }
}

// Create singleton instance
const bleHealthProcessor = new BLEHealthProcessor()

export default bleHealthProcessor
export { BLE_SERVICES, BLE_CHARACTERISTICS }
