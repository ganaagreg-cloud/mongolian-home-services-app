import express from 'express'
import cors from 'cors'
import { dbReady } from './db'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true }))
app.use(express.json())

import serviceTypesRouter from './routes/service-types'
import authMeRouter from './routes/auth-me'
import meRouter from './routes/me'
import workersRouter from './routes/workers'
import ordersRouter from './routes/orders'
import paymentsRouter from './routes/payments'
import sosRouter from './routes/sos'
import disputesRouter from './routes/disputes'
import adminRouter from './routes/admin'

app.use('/api', serviceTypesRouter)
app.use('/api', authMeRouter)
app.use('/api', meRouter)
app.use('/api', workersRouter)
app.use('/api', ordersRouter)
app.use('/api', paymentsRouter)
app.use('/api', sosRouter)
app.use('/api', disputesRouter)
app.use('/api', adminRouter)

const PORT = Number(process.env.PORT ?? 4000)
dbReady.then(() => app.listen(PORT, () => console.log(`[api] listening on :${PORT}`))).catch(() => process.exit(1))
