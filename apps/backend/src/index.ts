import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { prisma } from './lib/prisma.js'
import { asyncHandler, errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import equipmentTypesRouter from './routes/equipmentTypes.js'
import equipmentRouter from './routes/equipment.js'
import maintenanceRouter from './routes/maintenance.js'

const app = express()
const PORT = process.env.PORT ?? 3000

// CORS configuration - allow restricting via FRONTEND_URL env var in production
const corsOptions = {
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : true,
  credentials: true,
}
app.use(cors(corsOptions))
app.use(requestLogger)
app.use(express.json())

let lastDatabaseConnectionStatus: boolean | undefined
function logDatabaseConnectionStatus(connected: boolean): void {
  if (lastDatabaseConnectionStatus === connected) return
  lastDatabaseConnectionStatus = connected
  if (connected) {
    console.info('[database] PostgreSQL connected')
  } else {
    console.error('[database] PostgreSQL connection failed')
  }
}

async function checkDatabaseConnection(): Promise<{
  connected: boolean
  latency?: number
  error?: string
}> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    logDatabaseConnectionStatus(true)
    return { connected: true, latency: Date.now() - start }
  } catch {
    logDatabaseConnectionStatus(false)
    return { connected: false, error: 'Database connection unavailable' }
  }
}

app.get('/', (_req, res) => {
  res.json({
    name: 'MineTrack API',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  })
})

app.get('/health', asyncHandler(async (_req, res) => {
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
}))

// API routes
app.get('/api', (_req, res) => {
  res.json({
    name: 'MineTrack API',
    version: '1.0.0',
    status: 'running',
  })
})

app.use('/api/equipment-types', equipmentTypesRouter)
app.use('/api/equipment', equipmentRouter)
app.use('/api/maintenance', maintenanceRouter)

app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
  })
})

app.use(errorHandler)

const server = app.listen(PORT, () => {
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : PORT
  console.info(`[server] listening port=${port}`)
  void checkDatabaseConnection()
})

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(`[server] listen failed code=${error.code ?? 'unknown'}`)
  process.exitCode = 1
  void prisma.$disconnect().catch(() => {
    console.error('[database] Prisma disconnect failed')
  })
})

let shuttingDown = false
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  console.info(`[server] shutting down signal=${signal}`)

  await new Promise<void>((resolveShutdown) => {
    server.close((error) => {
      if (error) {
        console.error(`[server] close failed type=${error.name}`)
        process.exitCode = 1
      }
      resolveShutdown()
    })
  })

  try {
    await prisma.$disconnect()
    console.info('[database] Prisma disconnected')
  } catch {
    console.error('[database] Prisma disconnect failed')
    process.exitCode = 1
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT').catch(() => {
    console.error('[server] graceful shutdown failed')
    process.exitCode = 1
  })
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM').catch(() => {
    console.error('[server] graceful shutdown failed')
    process.exitCode = 1
  })
})

export default app