import Database from 'better-sqlite3'
import { config } from '../config.ts'

export const db = new Database(config.dbPath)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    original_name TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )
`)

// Detected garments: just enough for avatar.js to render them by name
// (FIPAvatar.render colors/shapes items by keyword match on `name`, not by
// image — see frontend/avatar.js). No sprite image involved.
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    photo_id TEXT NOT NULL,
    slot TEXT NOT NULL,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`)
