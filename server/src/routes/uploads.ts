import { randomUUID } from 'node:crypto'
import path from 'node:path'
import express, { type Router } from 'express'
import multer from 'multer'
import { config } from '../config.ts'
import { DEV_USER_ID } from '../constants.ts'
import { db } from '../db/db.ts'

const MAX_FILE_BYTES = 15 * 1024 * 1024
const MAX_FILES_PER_REQUEST = 10

const storage = multer.diskStorage({
  destination: config.uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || guessExtension(file.mimetype)
    cb(null, `${randomUUID()}${ext}`)
  },
})

function guessExtension(mimeType: string): string {
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  return '.jpg'
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_REQUEST },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('UNSUPPORTED_FILE_TYPE'))
      return
    }
    cb(null, true)
  },
})

const insertPhoto = db.prepare(`
  INSERT INTO photos (id, user_id, original_name, stored_filename, mime_type, size_bytes, created_at)
  VALUES (@id, @userId, @originalName, @storedFilename, @mimeType, @sizeBytes, @createdAt)
`)

export const uploadsRouter: Router = express.Router()

uploadsRouter.post('/', upload.array('photos', MAX_FILES_PER_REQUEST), (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined

  if (!files || files.length === 0) {
    res.status(400).json({ error: "We couldn't find any photos in that upload — try again?" })
    return
  }

  const createdAt = new Date().toISOString()
  const uploads = files.map((file) => {
    const id = randomUUID()
    insertPhoto.run({
      id,
      userId: DEV_USER_ID,
      originalName: file.originalname,
      storedFilename: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      createdAt,
    })
    return {
      id,
      url: `/assets/uploads/${file.filename}`,
      originalName: file.originalname,
      sizeBytes: file.size,
    }
  })

  res.json({ uploads })
})

uploadsRouter.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'One of those photos is too large (15MB max per photo).' })
      return
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({ error: 'You can upload up to 10 photos at a time.' })
      return
    }
  }
  if (err.message === 'UNSUPPORTED_FILE_TYPE') {
    res.status(400).json({ error: 'That file doesn’t look like an image — try a photo instead.' })
    return
  }
  res.status(500).json({ error: 'Something went wrong uploading your photos. Please try again.' })
})
