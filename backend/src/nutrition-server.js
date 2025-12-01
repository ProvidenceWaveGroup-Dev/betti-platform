import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import nutritionRoutes from './routes/nutrition.js'

dotenv.config()

const app = express()
const PORT = process.env.NUTRITION_PORT || 3002
const HOST = process.env.HOST || '0.0.0.0'

// CORS configuration - Allow local dev and ngrok public access
const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',
  'https://halibut-saved-gannet.ngrok-free.app'
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)
    // Allow all origins in development or if in allowed list
    if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    // Also allow any ngrok URL
    if (origin.includes('ngrok')) {
      return callback(null, true)
    }
    callback(null, true) // Allow all for now during development
  },
  credentials: true
}))
app.use(express.json())

// Routes
app.use('/api/nutrition', nutritionRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'nutrition-api',
    timestamp: new Date().toISOString()
  })
})

// Start nutrition server
app.listen(PORT, HOST, () => {
  console.log(`🥗 Nutrition API server running at http://${HOST}:${PORT}`)
  console.log(`📊 Nutrition endpoints available`)
})