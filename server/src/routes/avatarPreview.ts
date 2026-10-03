import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import express, { type Router } from 'express'
import { config } from '../config.ts'
import { db } from '../db/db.ts'
import { pixelizePhotoToBody } from '../services/photoToBody.ts'

interface PhotoRow {
  id: string
  stored_filename: string
}

const getPhoto = db.prepare('SELECT id, stored_filename FROM photos WHERE id = ?')

export const avatarPreviewRouter: Router = express.Router()

avatarPreviewRouter.post('/', async (req, res) => {
  const photoId = req.body?.photoId
  if (typeof photoId !== 'string') {
    res.status(400).json({ error: 'Missing photoId.' })
    return
  }

  const photo = getPhoto.get(photoId) as PhotoRow | undefined
  if (!photo) {
    res.status(404).json({ error: "We couldn't find that photo — try uploading again?" })
    return
  }

  try {
    const photoPath = path.join(config.uploadsDir, photo.stored_filename)
    const bodySprite = await pixelizePhotoToBody(photoPath)

    const filename = `${photo.id}-body.png`
    const outPath = path.join(config.processedDir, filename)
    await writeFile(outPath, bodySprite)

    res.json({ url: `/assets/processed/${filename}` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Couldn't turn that photo into a pixel avatar. Please try another photo." })
  }
})
