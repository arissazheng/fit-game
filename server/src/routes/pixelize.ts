import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import express, { type Router } from 'express'
import sharp from 'sharp'
import { CANVAS } from '@fit-game/shared'
import { config } from '../config.ts'
import { db } from '../db/db.ts'
import { pixelizeImage } from '../lib/pixelizeNode.ts'

interface PhotoRow {
  id: string
  stored_filename: string
}

const getPhoto = db.prepare('SELECT id, stored_filename FROM photos WHERE id = ?')

export const pixelizeRouter: Router = express.Router()

// Same 64x96 canvas as the avatar (frontend/avatar.js's CANVAS), so a
// pixelized photo drops in anywhere an avatar sprite would.
pixelizeRouter.post('/:photoId/pixelize', async (req, res) => {
  const photo = getPhoto.get(req.params.photoId) as PhotoRow | undefined
  if (!photo) {
    res.status(404).json({ error: "We couldn't find that photo — try uploading again?" })
    return
  }

  try {
    const photoPath = path.join(config.uploadsDir, photo.stored_filename)

    // Cover-crop to the avatar's aspect ratio first so the photo isn't
    // squashed into a different shape; pixelize() does the actual
    // downscale-to-grid + palette quantization + outline.
    const cropped = await sharp(photoPath)
      .resize(CANVAS.width * 8, CANVAS.height * 8, { fit: 'cover', position: 'top' })
      .png()
      .toBuffer()

    const pixelized = await pixelizeImage(cropped, {
      width: CANVAS.width,
      height: CANVAS.height,
      paletteColors: 20,
      outline: true,
    })

    const filename = `${photo.id}-pixelized.png`
    await writeFile(path.join(config.processedDir, filename), pixelized)

    res.json({ url: `/assets/processed/${filename}` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Couldn't pixelize that photo. Please try another one." })
  }
})
