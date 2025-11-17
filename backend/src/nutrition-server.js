import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import nutritionRoutes from './routes/nutrition.js'

dotenv.config()

const app = express()
const PORT = process.env.NUTRITION_PORT || 3002
const HOST = process.env.HOST || '0.0.0.0'

// Middleware - Allow CORS from all origins in development
app.use(cors({
  origin: true, // Allow all origins
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