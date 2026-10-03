import { mkdir } from 'node:fs/promises'
import express from 'express'
import { config } from './config.ts'
import './db/db.ts'
import { inventoryRouter, itemsRouter } from './routes/items.ts'
import { pixelizeRouter } from './routes/pixelize.ts'
import { uploadsRouter } from './routes/uploads.ts'
import { attachRooms } from './rooms.ts'

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
app.use('/api/photos', pixelizeRouter)
app.use('/api/photos', itemsRouter)
app.use('/api/inventory', inventoryRouter)

// The game itself — /frontend's index.html, demo.html, runway.html — served
// straight off disk. express.static serves index.html for "/" automatically.
app.use(express.static(config.frontendDir))

const httpServer = app.listen(config.port, () => {
  console.log(`Fit Game running at http://localhost:${config.port}`)
})

httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\nPort ${config.port} is already in use — another server (maybe a leftover ` +
      `"npm run dev") is still running. Stop it first: lsof -ti:${config.port} -sTCP:LISTEN | xargs kill -9\n`,
    )
    process.exit(1)
  }
  throw err
})

attachRooms(httpServer)
