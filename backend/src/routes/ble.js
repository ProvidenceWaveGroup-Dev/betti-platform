import express from 'express'
import bleScanner from '../services/bleScanner.js'
import BleDevicesRepo from '../repos/BleDevicesRepo.js'
import bleConnectionManager from '../services/bleConnectionManager.js'
import { broadcast } from '../index.js'

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
    const scanStatus = bleScanner.getStatus()
    const connectionStatus = bleConnectionManager.getStatus()
    const pairedDevices = BleDevicesRepo.findPaired()

    res.json({
      ...scanStatus,
      paired: pairedDevices.length,
      connected: connectionStatus.connectedCount,
      pairedDevices,
      connections: connectionStatus.connections,
      connectionManager: {
        isRunning: connectionStatus.isRunning,
        pollingIntervalMs: connectionStatus.pollingIntervalMs
      }
    })
  } catch (error) {
    console.error('Error in /api/ble/status:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/ble/pair - Pair a device
router.post('/pair', async (req, res) => {
  try {
    const { macAddress, name, deviceType = 'blood_pressure' } = req.body

    if (!macAddress) {
      return res.status(400).json({
        success: false,
        error: 'macAddress is required'
      })
    }

    console.log(`[BLE API] Pairing device: ${name} (${macAddress})`)

    // Unpair any previously paired devices of this type (single device constraint)
    const unpaired = BleDevicesRepo.unpairAll(deviceType)
    if (unpaired > 0) {
      console.log(`[BLE API] Unpaired ${unpaired} existing ${deviceType} device(s)`)
    }

    // Create or update device in database
    const device = BleDevicesRepo.create({
      macAddress,
      name,
      deviceType,
      manufacturer: null
    })

    // Set paired and trusted flags
    BleDevicesRepo.setPaired(macAddress, true)
    BleDevicesRepo.setTrusted(macAddress, true)

    // Start connection manager if not running
    if (!bleConnectionManager.getStatus().isRunning) {
      console.log('[BLE API] Starting connection manager...')
      bleConnectionManager.start()
    }

    // Broadcast pairing status change
    broadcast({
      type: 'ble-pairing-status',
      macAddress,
      name,
      paired: true
    })

    res.json({
      success: true,
      message: `Device ${name} paired successfully`,
      device
    })
  } catch (error) {
    console.error('Error in /api/ble/pair:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/ble/unpair - Unpair a device
router.post('/unpair', async (req, res) => {
  try {
    const { macAddress } = req.body

    if (!macAddress) {
      return res.status(400).json({
        success: false,
        error: 'macAddress is required'
      })
    }

    const device = BleDevicesRepo.findByMac(macAddress)
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      })
    }

    console.log(`[BLE API] Unpairing device: ${device.name} (${macAddress})`)

    // Disconnect if currently connected
    if (bleConnectionManager.isConnected(macAddress)) {
      await bleConnectionManager.disconnectDevice(macAddress)
    }

    // Unpair device
    BleDevicesRepo.setPaired(macAddress, false)
    BleDevicesRepo.setTrusted(macAddress, false)

    // Stop connection manager if no paired devices remain
    const pairedDevices = BleDevicesRepo.findPaired()
    if (pairedDevices.length === 0) {
      console.log('[BLE API] No paired devices remaining, stopping connection manager')
      bleConnectionManager.stop()
    }

    // Broadcast pairing status change
    broadcast({
      type: 'ble-pairing-status',
      macAddress,
      name: device.name,
      paired: false
    })

    res.json({
      success: true,
      message: `Device ${device.name} unpaired successfully`
    })
  } catch (error) {
    console.error('Error in /api/ble/unpair:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/ble/paired - Get all paired devices
router.get('/paired', (req, res) => {
  try {
    const pairedDevices = BleDevicesRepo.findPaired()
    const connectionStatus = bleConnectionManager.getStatus()

    // Enrich devices with connection status
    const devices = pairedDevices.map(device => ({
      ...device,
      isConnected: bleConnectionManager.isConnected(device.macAddress)
    }))

    res.json({
      success: true,
      devices,
      connectionManager: connectionStatus
    })
  } catch (error) {
    console.error('Error in /api/ble/paired:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
