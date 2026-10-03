import type { AvatarSpec, Facing, Item, LayerKey, Outfit, Slot } from './types'

export const CANVAS = { width: 64, height: 128 }

export const SLOT_BOXES: Record<Slot, { x: number; y: number; w: number; h: number }> = {
  top: { x: 8, y: 28, w: 48, h: 40 },
  bottom: { x: 16, y: 60, w: 32, h: 52 },
  dress: { x: 12, y: 28, w: 40, h: 72 },
  outerwear: { x: 6, y: 26, w: 52, h: 54 },
  shoes: { x: 16, y: 110, w: 32, h: 18 },
  head: { x: 12, y: 0, w: 40, h: 20 },
  face: { x: 20, y: 10, w: 24, h: 8 },
  neck: { x: 22, y: 24, w: 20, h: 20 },
  bag: { x: 46, y: 56, w: 18, h: 28 },
}

export const LAYER_ORDER: LayerKey[] = [
  'body',
  'bottom',
  'shoes',
  'top',
  'dress',
  'outerwear',
  'neck',
  'bag',
  'face',
  'head',
]

export const AVATAR_SPEC: AvatarSpec = {
  canvas: CANVAS,
  slotBoxes: SLOT_BOXES,
  layerOrder: LAYER_ORDER,
}

/** Shown when top/bottom are empty and no dress is equipped. */
export const DEFAULT_TOP_SPRITE = '/assets/defaults/tank-top.png'
export const DEFAULT_BOTTOM_SPRITE = '/assets/defaults/shorts.png'

/**
 * Equipping a dress clears top/bottom (and vice versa); any other slot just
 * replaces whatever was equipped there.
 */
export function applyEquip(outfit: Outfit, item: Item): Outfit {
  const equipped = { ...outfit.equipped }

  if (item.slot === 'dress') {
    delete equipped.top
    delete equipped.bottom
  } else if (item.slot === 'top' || item.slot === 'bottom') {
    delete equipped.dress
  }

  equipped[item.slot] = item

  return { ...outfit, equipped }
}

export interface AvatarLayer {
  layer: LayerKey
  spritePath: string
}

/**
 * Back view reuses the front sprites for every equip slot except
 * face/neck/bag (hidden, since those items are drawn front-facing and
 * would look wrong from behind); the body sprite itself supplies a
 * back-of-head hair layer for that facing.
 */
const HIDDEN_WHEN_FACING_BACK = new Set<LayerKey>(['face', 'neck', 'bag'])

export function composeAvatar(outfit: Outfit, facing: Facing = 'front'): AvatarLayer[] {
  const layers: AvatarLayer[] = []

  for (const layer of LAYER_ORDER) {
    if (facing === 'back' && HIDDEN_WHEN_FACING_BACK.has(layer)) continue

    if (layer === 'body') {
      layers.push({ layer, spritePath: outfit.body[facing] })
      continue
    }

    const slot = layer as Slot
    const equipped = outfit.equipped[slot]

    if (equipped) {
      layers.push({ layer, spritePath: equipped.spritePath })
    } else if (slot === 'top' && !outfit.equipped.dress) {
      layers.push({ layer, spritePath: DEFAULT_TOP_SPRITE })
    } else if (slot === 'bottom' && !outfit.equipped.dress) {
      layers.push({ layer, spritePath: DEFAULT_BOTTOM_SPRITE })
    }
  }

  return layers
}
