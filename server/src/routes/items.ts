import { randomUUID } from 'node:crypto'
import path from 'node:path'
import express, { type Router } from 'express'
import { config } from '../config.ts'
import { DEV_USER_ID } from '../constants.ts'
import { db } from '../db/db.ts'
import { extractGarments } from '../services/extractGarments.ts'

interface PhotoRow {
  id: string
  stored_filename: string
}

const getPhoto = db.prepare('SELECT id, stored_filename FROM photos WHERE id = ?')
const insertItem = db.prepare(`
  INSERT INTO items (id, user_id, photo_id, slot, name, source, created_at)
  VALUES (@id, @userId, @photoId, @slot, @name, @source, @createdAt)
`)
const listItems = db.prepare('SELECT id, slot, name, source FROM items WHERE user_id = ? ORDER BY created_at ASC')

export const itemsRouter: Router = express.Router()

// Detects garments in an already-uploaded photo (OpenAI vision, or
// USE_MOCK_EXTRACTION=true) and saves them as real closet items. avatar.js
// renders items by name (keyword-colored shapes) — no sprite image involved.
itemsRouter.post('/:photoId/extract', async (req, res) => {
  const photo = getPhoto.get(req.params.photoId) as PhotoRow | undefined
  if (!photo) {
    res.status(404).json({ error: "We couldn't find that photo — try uploading again?" })
    return
  }

  try {
    const photoPath = path.join(config.uploadsDir, photo.stored_filename)
    const detected = await extractGarments(photoPath)

    const createdAt = new Date().toISOString()
    const items = detected.map((garment) => {
      const id = randomUUID()
      insertItem.run({ id, userId: DEV_USER_ID, photoId: photo.id, slot: garment.slot, name: garment.name, source: 'closet', createdAt })
      return { id, slot: garment.slot, name: garment.name }
    })

    res.json({ items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Couldn't find clothes in that photo. Try another one?" })
  }
})

export const inventoryRouter: Router = express.Router()

inventoryRouter.get('/', (_req, res) => {
  const items = listItems.all(DEV_USER_ID)
  res.json({ items })
})
