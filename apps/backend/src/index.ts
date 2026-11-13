import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { errorHandler } from './middleware/errorHandler.js'
import equipmentTypesRouter from './routes/equipmentTypes.js'
import equipmentRouter from './routes/equipment.js'
import maintenanceRouter from './routes/maintenance.js'

const app = express()
const PORT = process.env.PORT ?? 3000

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// Make prisma available globally for controllers
declare global {
  namespace Express {
    interface Application {
      prisma: PrismaClient
    }
  }
}
app.prisma = prisma

// Middleware
app.use(cors())
app.use(express.json())

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
})

// Database connection check
async function checkDatabaseConnection(): Promise<{ connected: boolean; latency?: number; error?: string }> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { connected: true, latency: Date.now() - start }
  } catch (error) {
    return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection()

  const health = {
    status: dbStatus.connected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV ?? 'development',
    database: {
      connected: dbStatus.connected,
      latency: dbStatus.latency,
      error: dbStatus.error,
    },
  }

  const statusCode = dbStatus.connected ? 200 : 503
  res.status(statusCode).json(health)
})

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'MineTrack API',
    version: '1.0.0',
    status: 'running',
  })
})

app.use('/api/equipment-types', equipmentTypesRouter)
app.use('/api/equipment', equipmentRouter)
app.use('/api/maintenance', maintenanceRouter)

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler
app.use(errorHandler)

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down...')
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})

export default app