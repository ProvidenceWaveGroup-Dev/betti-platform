import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import dotenv from 'dotenv'
import bleRoutes from './routes/ble.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '0.0.0.0'

// Middleware - Allow CORS from all origins in development
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}))
app.use(express.json())

// Create HTTP server
const server = createServer(app)

// Create WebSocket server
const wss = new WebSocketServer({ server })

// Store WebSocket clients
const wsClients = new Set()

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected')
  wsClients.add(ws)

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
    wsClients.delete(ws)
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
    wsClients.delete(ws)
  })

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to Betti backend'
  }))
})

// Make wsClients available to routes
app.locals.wsClients = wsClients

// Routes
app.use('/api/ble', bleRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    websocketClients: wsClients.size
  })
})

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 Betti backend server running at http://${HOST}:${PORT}`)
  console.log(`📡 WebSocket server ready`)
  console.log(`🔵 Bluetooth LE scanning available`)
})

// Broadcast function for WebSocket
export function broadcast(data) {
  const message = JSON.stringify(data)
  wsClients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(message)
    }
  })
}
