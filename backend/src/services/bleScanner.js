import { spawn } from 'child_process'
import { broadcast } from '../index.js'

class BLEScanner {
  constructor() {
    this.isScanning = false
    this.scanTimeout = null
    this.discoveredDevices = new Map()
    this.scanDuration = 30000 // 30 seconds
    this.scanProcess = null
  }

  handleDeviceDiscovery(address, name, rssi) {
    // Normalize MAC address format
    const normalizedAddress = address.toUpperCase()
    const deviceId = normalizedAddress.replace(/:/g, '').toLowerCase()

    const device = {
      id: deviceId,
      name: name || 'Unknown Device',
      address: normalizedAddress,
      rssi: rssi || 0,
      lastSeen: new Date().toISOString(),
      manufacturer: null
    }

    // Check if device is new or needs updating
    const existingDevice = this.discoveredDevices.get(device.id)
    if (!existingDevice || existingDevice.rssi !== device.rssi || existingDevice.name === 'Unknown Device') {
      this.discoveredDevices.set(device.id, device)

      // Broadcast to all connected WebSocket clients
      broadcast({
        type: 'ble-device',
        device: device
      })

      console.log(`📱 BLE Device: ${device.name} (${device.address}) - RSSI: ${device.rssi}`)
    }
  }

  parseBluetoothctlOutput(line) {
    // Parse bluetoothctl scan output
    // Format examples:
    // [NEW] Device B4:34:31:E7:21:87 Device Name
    // [CHG] Device B4:34:31:E7:21:87 RSSI: -50
    // [CHG] Device B4:34:31:E7:21:87 Name: Device Name

    const newDeviceMatch = line.match(/\[NEW\]\s+Device\s+([0-9A-F:]+)\s*(.*)?/i)
    if (newDeviceMatch) {
      const address = newDeviceMatch[1]
      const name = newDeviceMatch[2]?.trim() || null
      this.handleDeviceDiscovery(address, name, 0)
      return
    }

    const rssiMatch = line.match(/\[CHG\]\s+Device\s+([0-9A-F:]+)\s+RSSI:\s*(-?\d+)/i)
    if (rssiMatch) {
      const address = rssiMatch[1]
      const rssi = parseInt(rssiMatch[2])
      const deviceId = address.replace(/:/g, '').toLowerCase()
      const existingDevice = this.discoveredDevices.get(deviceId)
      if (existingDevice) {
        this.handleDeviceDiscovery(address, existingDevice.name, rssi)
      } else {
        this.handleDeviceDiscovery(address, null, rssi)
      }
      return
    }

    const nameMatch = line.match(/\[CHG\]\s+Device\s+([0-9A-F:]+)\s+Name:\s*(.+)/i)
    if (nameMatch) {
      const address = nameMatch[1]
      const name = nameMatch[2]?.trim()
      const deviceId = address.replace(/:/g, '').toLowerCase()
      const existingDevice = this.discoveredDevices.get(deviceId)
      if (existingDevice) {
        this.handleDeviceDiscovery(address, name, existingDevice.rssi)
      } else {
        this.handleDeviceDiscovery(address, name, 0)
      }
      return
    }
  }

  async startScan() {
    if (this.isScanning) {
      console.log('Scan already in progress')
      return { success: false, message: 'Scan already in progress' }
    }

    try {
      // Clear previous discoveries
      this.discoveredDevices.clear()
      this.isScanning = true

      // Broadcast scan started status
      broadcast({
        type: 'ble-scan-status',
        status: 'scanning'
      })

      console.log(`🔍 Starting BLE scan for ${this.scanDuration / 1000} seconds using bluetoothctl...`)

      // Start bluetoothctl in interactive mode
      this.scanProcess = spawn('bluetoothctl')

      // Handle stdout - parse device discoveries
      this.scanProcess.stdout.on('data', (data) => {
        const output = data.toString()
        // Remove ANSI escape codes
        const cleanOutput = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
        const lines = cleanOutput.split('\n')
        lines.forEach((line) => {
          if (line.trim()) {
            this.parseBluetoothctlOutput(line)
          }
        })
      })

      // Handle stderr
      this.scanProcess.stderr.on('data', (data) => {
        console.error(`bluetoothctl stderr: ${data}`)
      })

      // Handle process exit
      this.scanProcess.on('exit', (code) => {
        console.log(`bluetoothctl process exited with code ${code}`)
        if (this.isScanning) {
          this.isScanning = false
          broadcast({
            type: 'ble-scan-status',
            status: 'idle',
            devicesFound: this.discoveredDevices.size
          })
        }
      })

      // Write "scan on" command to bluetoothctl stdin
      this.scanProcess.stdin.write('scan on\n')

      // Set timeout to stop scanning after duration
      this.scanTimeout = setTimeout(() => {
        this.stopScan()
      }, this.scanDuration)

      return { success: true, message: 'Scan started' }
    } catch (error) {
      console.error('Error starting BLE scan:', error)
      this.isScanning = false

      broadcast({
        type: 'ble-scan-status',
        status: 'error',
        error: error.message
      })

      return { success: false, message: error.message }
    }
  }

  async stopScan() {
    if (!this.isScanning) {
      return
    }

    try {
      console.log('🛑 Stopping BLE scan...')

      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout)
        this.scanTimeout = null
      }

      // Stop bluetoothctl scan
      if (this.scanProcess) {
        // Send "scan off" and "quit" commands to bluetoothctl stdin
        this.scanProcess.stdin.write('scan off\n')
        this.scanProcess.stdin.write('quit\n')

        // Give it a moment to process then kill if still alive
        setTimeout(() => {
          if (this.scanProcess) {
            this.scanProcess.kill('SIGTERM')
            this.scanProcess = null
          }
        }, 500)
      }

      this.isScanning = false

      // Broadcast scan completed status
      broadcast({
        type: 'ble-scan-status',
        status: 'idle',
        devicesFound: this.discoveredDevices.size
      })

      console.log(`✅ Scan complete. Found ${this.discoveredDevices.size} devices`)
    } catch (error) {
      console.error('Error stopping BLE scan:', error)
      this.isScanning = false
    }
  }

  getStatus() {
    return {
      isScanning: this.isScanning,
      bluetoothState: 'poweredOn', // Assume powered on if we can run bluetoothctl
      devicesFound: this.discoveredDevices.size,
      devices: Array.from(this.discoveredDevices.values())
    }
  }
}

// Create singleton instance
const bleScanner = new BLEScanner()

export default bleScanner
