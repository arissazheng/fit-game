/**
 * Mirrors the data model actually used by the live prototype
 * (.claude/skills/pixel-ui/avatar.js + game.js), not an independently
 * designed spec — garments are free-text names (avatar.js colors them by
 * keyword match "until real extracted sprites replace them"), and the
 * avatar itself is a procedurally-drawn chibi, not a sprite stack.
 */

export type Slot = 'top' | 'bottom' | 'dress' | 'accessory'

/** Documentation only — matches avatar.js's actual (hardcoded) draw order. */
export type LayerKey = 'backHair' | 'body' | 'shoes' | 'bottom' | 'top' | 'dress' | 'face' | 'frontHair' | 'accessories'

export interface Look {
  name: string
  /** hex */
  skin: string
  /** hex */
  hair: string
  /** hairstyle id, e.g. 'braids' — see HAIRSTYLES */
  style: string
}

export interface Outfit {
  theme?: string
  top: string | null
  bottom: string | null
  dress: string | null
  accessories: string[]
  savedAt?: string
}

/** A real garment once extraction (step 5) exists — not yet consumed by the renderer. */
export interface Item {
  id: string
  slot: Slot
  name: string
  /** 64x96 transparent PNG, once sprite rendering replaces the name-based placeholder look */
  spritePath?: string
  originalCropPath?: string
  /** 2-3 dominant hex colors */
  colors?: string[]
  source: 'closet' | 'marketplace'
  ownerId?: string
}

export interface User {
  id: string
  email: string
  createdAt: string
}

export interface Wallet {
  userId: string
  coins: number
}
