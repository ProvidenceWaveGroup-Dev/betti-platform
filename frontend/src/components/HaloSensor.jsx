import React, { useState, useEffect, useRef } from 'react'
import wsClient from '../services/websocket'
import './HaloSensor.css'

// Simple IMU Chart component - shows 1 second of data
function IMUChart({ history }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || history.length === 0) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const padding = 20
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // Clear canvas
    ctx.fillStyle = 'rgba(10, 10, 20, 0.8)'
    ctx.fillRect(0, 0, width, height)

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1

    // Horizontal grid (5 lines)
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Find min/max for scaling
    let minVal = -2, maxVal = 2 // Default range for accelerometer in g
    history.forEach(d => {
      if (d.x !== null) {
        minVal = Math.min(minVal, d.x, d.y, d.z)
        maxVal = Math.max(maxVal, d.x, d.y, d.z)
      }
    })

    // Add some padding to range
    const range = maxVal - minVal || 1
    minVal -= range * 0.1
    maxVal += range * 0.1

    // Scale function
    const scaleY = (val) => {
      if (val === null) return null
      return padding + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight
    }

    const scaleX = (i) => padding + (i / (history.length - 1 || 1)) * chartWidth

    // Draw lines for X, Y, Z
    const colors = {
      x: '#ff6b6b', // Red
      y: '#4ecdc4', // Teal
      z: '#ffe66d'  // Yellow
    }

    const drawLine = (axis, color) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()

      let started = false
      history.forEach((d, i) => {
        const val = d[axis]
        if (val === null) return

        const x = scaleX(i)
        const y = scaleY(val)

        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else {
          ctx.lineTo(x, y)
        }
      })

      ctx.stroke()
    }

    drawLine('x', colors.x)
    drawLine('y', colors.y)
    drawLine('z', colors.z)

    // Draw legend
    const legendY = height - 8
    ctx.font = '10px sans-serif'

    ctx.fillStyle = colors.x
    ctx.fillText('X', padding, legendY)

    ctx.fillStyle = colors.y
    ctx.fillText('Y', padding + 30, legendY)

    ctx.fillStyle = colors.z
    ctx.fillText('Z', padding + 60, legendY)

  }, [history])

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={120}
      className="imu-chart-canvas"
    />
  )
}

function HaloSensor({ isCollapsed = false }) {
  const [sensorData, setSensorData] = useState({
    temperature: null,
    humidity: null,
    light: null,
    imu: { x: null, y: null, z: null },
    lastUpdate: null
  })
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [imuHistory, setImuHistory] = useState([]) // Store last 1 second of IMU data
  const maxHistoryLength = 20 // ~1 second at 20Hz update rate

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const [recordingData, setRecordingData] = useState([])
  const recordingRef = useRef(null)
  const recordingStartTime = useRef(null)
  const RECORDING_DURATION = 10000 // 10 seconds in ms

  useEffect(() => {
    // Listen for Halo sensor updates
    const handleSensorUpdate = (data) => {
      console.log('Halo sensor update received:', data)
      setSensorData({
        temperature: data.temperature,
        humidity: data.humidity,
        light: data.light,
        imu: data.imu || { x: null, y: null, z: null },
        lastUpdate: data.lastUpdate
      })

      // Update IMU history for chart
      if (data.imu && data.imu.x !== null) {
        setImuHistory(prev => {
          const newHistory = [...prev, { x: data.imu.x, y: data.imu.y, z: data.imu.z }]
          // Keep only the last maxHistoryLength entries
          if (newHistory.length > maxHistoryLength) {
            return newHistory.slice(-maxHistoryLength)
          }
          return newHistory
        })
      }

      // If we're receiving data, we're connected
      setConnectionStatus('connected')
    }

    // Listen for connection status changes
    const handleConnectionStatus = (data) => {
      console.log('Halo connection status:', data)
      setConnectionStatus(data.status)
    }

    wsClient.on('halo-sensor-update', handleSensorUpdate)
    wsClient.on('halo-connection-status', handleConnectionStatus)

    // Make sure WebSocket is connected
    if (!wsClient.ws || wsClient.ws.readyState !== WebSocket.OPEN) {
      wsClient.connect()
    }

    return () => {
      wsClient.off('halo-sensor-update', handleSensorUpdate)
      wsClient.off('halo-connection-status', handleConnectionStatus)
    }
  }, [])

  // Format time since last update
  const formatLastUpdate = () => {
    if (!sensorData.lastUpdate) return 'No data'
    const now = new Date()
    const updateTime = new Date(sensorData.lastUpdate)
    const diffMs = now - updateTime
    const diffSec = Math.floor(diffMs / 1000)

    if (diffSec < 10) return 'Just now'
    if (diffSec < 60) return `${diffSec}s ago`
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    return updateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Connection status indicator
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return { label: 'Connected', className: 'status-connected' }
      case 'connecting':
        return { label: 'Connecting...', className: 'status-connecting' }
      default:
        return { label: 'Scanning...', className: 'status-disconnected' }
    }
  }

  const statusInfo = getStatusInfo()
  const isConnected = connectionStatus === 'connected'

  // Start recording IMU data
  const startRecording = () => {
    console.log('[HaloSensor] startRecording called, isRecording:', isRecording, 'isConnected:', isConnected)
    if (isRecording) return

    console.log('[HaloSensor] Starting recording...')
    setIsRecording(true)
    setRecordingProgress(0)
    setRecordingData([])
    recordingStartTime.current = Date.now()

    // Set up progress interval
    recordingRef.current = setInterval(() => {
      const elapsed = Date.now() - recordingStartTime.current
      const progress = Math.min((elapsed / RECORDING_DURATION) * 100, 100)
      setRecordingProgress(progress)

      if (elapsed >= RECORDING_DURATION) {
        stopRecording()
      }
    }, 100)
  }

  // Stop recording and save data
  const stopRecording = async () => {
    if (recordingRef.current) {
      clearInterval(recordingRef.current)
      recordingRef.current = null
    }

    setIsRecording(false)
    setRecordingProgress(0)

    // Get the recorded data from state
    setRecordingData(currentData => {
      if (currentData.length > 0) {
        saveRecordingToServer(currentData)
      }
      return []
    })
  }

  // Save recording to server
  const saveRecordingToServer = async (data) => {
    try {
      const response = await fetch('/api/accelerometer/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      })

      const result = await response.json()
      if (result.success) {
        console.log('Recording saved:', result.filename)
      } else {
        console.error('Failed to save recording:', result.error)
      }
    } catch (error) {
      console.error('Error saving recording:', error)
    }
  }

  // Capture IMU data during recording
  useEffect(() => {
    if (isRecording && sensorData.imu && sensorData.imu.x !== null) {
      const timestamp = Date.now() - recordingStartTime.current
      setRecordingData(prev => [...prev, {
        timestamp,
        x: sensorData.imu.x,
        y: sensorData.imu.y,
        z: sensorData.imu.z
      }])
    }
  }, [isRecording, sensorData.imu])

  // Collapsed/Mini view for sidebar
  if (isCollapsed) {
    return (
      <div className={`halo-mini ${!isConnected ? 'disconnected' : ''}`}>
        <div className="mini-header">
          <span className="mini-icon">🌡️</span>
          <span className="mini-title">Environment</span>
          <span className={`mini-status ${statusInfo.className}`}>
            <span className="status-dot"></span>
            {statusInfo.label}
          </span>
        </div>
        <div className="mini-sensors-grid">
          <div className="mini-sensor-item">
            <span className="mini-sensor-icon">🌡️</span>
            <div className="mini-sensor-info">
              <span className="mini-sensor-value">
                {isConnected && sensorData.temperature != null ? `${sensorData.temperature}°F` : '--'}
              </span>
              <span className="mini-sensor-label">Temp</span>
            </div>
          </div>
          <div className="mini-sensor-item">
            <span className="mini-sensor-icon">💧</span>
            <div className="mini-sensor-info">
              <span className="mini-sensor-value">
                {isConnected && sensorData.humidity != null ? `${sensorData.humidity}%` : '--'}
              </span>
              <span className="mini-sensor-label">Humidity</span>
            </div>
          </div>
          <div className="mini-sensor-item">
            <span className="mini-sensor-icon">☀️</span>
            <div className="mini-sensor-info">
              <span className="mini-sensor-value">
                {isConnected && sensorData.light != null ? `${Math.round(sensorData.light)}` : '--'}
              </span>
              <span className="mini-sensor-label">Lux</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full view
  return (
    <div className={`halo-widget ${!isConnected ? 'disconnected' : ''}`}>
      <div className="halo-header">
        <h2 className="halo-title">Environment</h2>
        <div className={`halo-status ${statusInfo.className}`}>
          <span className="status-dot"></span>
          {statusInfo.label}
        </div>
      </div>

      <div className="halo-grid">
        {/* Temperature Card */}
        <div className="sensor-card temperature-card">
          <div className="sensor-icon">🌡️</div>
          <div className="sensor-info">
            <span className="sensor-label">TEMPERATURE</span>
            <span className="sensor-value">
              {isConnected && sensorData.temperature != null ? (
                <>
                  {sensorData.temperature}
                  <span className="sensor-unit">°F</span>
                </>
              ) : (
                '--'
              )}
            </span>
            <span className="sensor-time">{formatLastUpdate()}</span>
          </div>
        </div>

        {/* Humidity Card */}
        <div className="sensor-card humidity-card">
          <div className="sensor-icon">💧</div>
          <div className="sensor-info">
            <span className="sensor-label">HUMIDITY</span>
            <span className="sensor-value">
              {isConnected && sensorData.humidity != null ? (
                <>
                  {sensorData.humidity}
                  <span className="sensor-unit">%</span>
                </>
              ) : (
                '--'
              )}
            </span>
            <span className="sensor-time">{formatLastUpdate()}</span>
          </div>
        </div>

        {/* Light Card */}
        <div className="sensor-card light-card">
          <div className="sensor-icon">☀️</div>
          <div className="sensor-info">
            <span className="sensor-label">AMBIENT LIGHT</span>
            <span className="sensor-value">
              {isConnected && sensorData.light != null ? (
                <>
                  {Math.round(sensorData.light)}
                  <span className="sensor-unit">Lux</span>
                </>
              ) : (
                '--'
              )}
            </span>
            <span className="sensor-time">{formatLastUpdate()}</span>
          </div>
        </div>

        {/* IMU Card */}
        <div className="sensor-card imu-card">
          <div className="sensor-icon">📐</div>
          <div className="sensor-info">
            <span className="sensor-label">ACCELEROMETER</span>
            <div className="imu-content">
              <div className="imu-values">
                <div className="imu-axis">
                  <span className="imu-axis-label">X</span>
                  <span className="imu-axis-value">
                    {isConnected && sensorData.imu?.x != null ? `${sensorData.imu.x}g` : '--'}
                  </span>
                </div>
                <div className="imu-axis">
                  <span className="imu-axis-label">Y</span>
                  <span className="imu-axis-value">
                    {isConnected && sensorData.imu?.y != null ? `${sensorData.imu.y}g` : '--'}
                  </span>
                </div>
                <div className="imu-axis">
                  <span className="imu-axis-label">Z</span>
                  <span className="imu-axis-value">
                    {isConnected && sensorData.imu?.z != null ? `${sensorData.imu.z}g` : '--'}
                  </span>
                </div>
              </div>
              <div className="imu-chart">
                <IMUChart history={imuHistory} />
                <div className="imu-record-controls">
                  <button
                    className={`record-btn ${isRecording ? 'recording' : ''}`}
                    onClick={() => {
                      console.log('[HaloSensor] Record button clicked')
                      if (isRecording) {
                        stopRecording()
                      } else {
                        startRecording()
                      }
                    }}
                  >
                    <span className="record-icon">{isRecording ? '⏹' : '⏺'}</span>
                    <span className="record-label">{isRecording ? 'Stop' : 'Record'}</span>
                  </button>
                  {isRecording && (
                    <div className="recording-progress">
                      <div
                        className="recording-progress-bar"
                        style={{ width: `${recordingProgress}%` }}
                      />
                      <span className="recording-time">{Math.ceil((100 - recordingProgress) / 10)}s</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <span className="sensor-time">{formatLastUpdate()}</span>
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="halo-scanning-message">
          <span className="scanning-spinner"></span>
          Scanning for Halo sensor...
        </div>
      )}
    </div>
  )
}

export default HaloSensor
