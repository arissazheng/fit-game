import { mkdir } from 'node:fs/promises'
import express from 'express'
import { config } from './config.ts'
import './db/db.ts'
import { uploadsRouter } from './routes/uploads.ts'

await mkdir(config.uploadsDir, { recursive: true })
await mkdir(config.processedDir, { recursive: true })

const app = express()

app.use(express.json())

// Frontend and API are same-origin (both served from here), so this is only
// needed for the rare case something still hits the API from elsewhere.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin ?? '*')
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

// The game itself — /frontend's index.html, demo.html, runway.html — served
// straight off disk. express.static serves index.html for "/" automatically.
app.use(express.static(config.frontendDir))

app.listen(config.port, () => {
  console.log(`Fit Game running at http://localhost:${config.port}`)
})
