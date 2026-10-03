import { mkdir } from 'node:fs/promises'
import express from 'express'
import { config } from './config.ts'
import './db/db.ts'
import { avatarPreviewRouter } from './routes/avatarPreview.ts'
import { uploadsRouter } from './routes/uploads.ts'

await mkdir(config.uploadsDir, { recursive: true })
await mkdir(config.processedDir, { recursive: true })

const app = express()

app.use(express.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.use('/assets/processed', express.static(config.processedDir))
app.use('/assets/uploads', express.static(config.uploadsDir))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/uploads', uploadsRouter)
app.use('/api/avatar/preview', avatarPreviewRouter)

app.listen(config.port, () => {
  console.log(`fit-game server listening on http://localhost:${config.port}`)
})
