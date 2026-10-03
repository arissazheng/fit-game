export type Slot =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'outerwear'
  | 'shoes'
  | 'head'
  | 'face'
  | 'neck'
  | 'bag'

export type LayerKey = 'body' | Slot

export interface SlotBox {
  x: number
  y: number
  w: number
  h: number
}

export interface CanvasSpec {
  width: number
  height: number
}

export interface AvatarSpec {
  canvas: CanvasSpec
  slotBoxes: Record<Slot, SlotBox>
  layerOrder: LayerKey[]
}

export interface Item {
  id: string
  slot: Slot
  name?: string
  /** 64x128 transparent PNG, front-facing, already positioned per SLOT_BOXES */
  spritePath: string
  originalCropPath?: string
  /** 2-3 dominant hex colors */
  colors?: string[]
  source: 'closet' | 'marketplace'
  ownerId?: string
}

export type Facing = 'front' | 'back'

export interface BodySprite {
  front: string
  back: string
}

export interface Outfit {
  body: BodySprite
  equipped: Partial<Record<Slot, Item>>
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
