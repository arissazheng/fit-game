import type { LayerKey, Look, Outfit, Slot } from './types'

/**
 * Canonical values mirrored from frontend/avatar.js, which is
 * the actual renderer the live prototype uses. Keep these in sync with that
 * file by hand — it's plain browser JS (an IIFE attaching window.FIPAvatar),
 * not something this Node/TS package can import directly.
 */
export const CANVAS = { width: 64, height: 96 }

export const SKIN_TONES = [
  { name: 'Porcelain', hex: '#fde3d3' },
  { name: 'Light', hex: '#f6cfb5' },
  { name: 'Warm', hex: '#e8b48f' },
  { name: 'Tan', hex: '#c98d63' },
  { name: 'Brown', hex: '#9a6240' },
  { name: 'Deep', hex: '#6b4029' },
]

export const HAIR_COLORS = [
  { name: 'Espresso', hex: '#3b2219' },
  { name: 'Black', hex: '#1e1a1d' },
  { name: 'Chestnut', hex: '#6e3f24' },
  { name: 'Honey', hex: '#c58a3f' },
  { name: 'Blonde', hex: '#e8cf7a' },
  { name: 'Ginger', hex: '#c45a2a' },
  { name: 'Pink', hex: '#f0a3bf' },
  { name: 'Lilac', hex: '#b49ad8' },
  { name: 'Silver', hex: '#c9c9d1' },
  { name: 'Blue', hex: '#5b7fd1' },
]

export const HAIRSTYLES = [
  { id: 'long', name: 'Long' },
  { id: 'braids', name: 'Braids' },
  { id: 'bob', name: 'Bob' },
  { id: 'short', name: 'Short' },
  { id: 'buns', name: 'Space buns' },
  { id: 'ponytail', name: 'Ponytail' },
]

export const DEFAULT_LOOK: Look = { name: '', skin: SKIN_TONES[1].hex, hair: HAIR_COLORS[0].hex, style: 'braids' }

/** Back to front, per avatar.js's render(). Documentation only — avatar.js owns the actual draw order. */
export const LAYER_ORDER: LayerKey[] = ['backHair', 'body', 'shoes', 'bottom', 'top', 'dress', 'face', 'frontHair', 'accessories']

export const EMPTY_OUTFIT: Outfit = { top: null, bottom: null, dress: null, accessories: [] }

/**
 * Equipping a dress clears top/bottom (and vice versa); any other slot just
 * replaces whatever was equipped there. Accessories are a flat add/remove
 * list (avatar.js draws all of them).
 */
export function applyEquip(outfit: Outfit, slot: Exclude<Slot, 'accessory'>, name: string | null): Outfit {
  const next = { ...outfit, [slot]: name }

  if (name) {
    if (slot === 'dress') {
      next.top = null
      next.bottom = null
    } else {
      next.dress = null
    }
  }

  return next
}

export function addAccessory(outfit: Outfit, name: string): Outfit {
  if (outfit.accessories.includes(name)) return outfit
  return { ...outfit, accessories: [...outfit.accessories, name] }
}

export function removeAccessory(outfit: Outfit, name: string): Outfit {
  return { ...outfit, accessories: outfit.accessories.filter((a) => a !== name) }
}
