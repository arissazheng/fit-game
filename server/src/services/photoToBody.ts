import sharp from 'sharp'
import { CANVAS } from '@fit-game/shared'
import { pixelize } from '@fit-game/shared'

/** Internal pixel grid before upscaling to the full 64x128 canvas (2x, clean integer scale). */
const GRID_WIDTH = CANVAS.width / 2
const GRID_HEIGHT = CANVAS.height / 2

/**
 * Early stand-in for the real "user -> avatar" pipeline (step 7, which will
 * add skin/hair tinting and a true back view). For now: cover-crop the
 * user's photo to the avatar's aspect ratio and run it through the same
 * shared pixelize() module used everywhere else, so there's a visible,
 * real photo -> pixel-avatar result end to end.
 */
export async function pixelizePhotoToBody(photoPath: string): Promise<Buffer> {
  const { data, info } = await sharp(photoPath)
    .resize(GRID_WIDTH * 8, GRID_HEIGHT * 8, { fit: 'cover', position: 'top' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixelized = pixelize(
    { width: info.width, height: info.height, data: new Uint8ClampedArray(data) },
    { width: GRID_WIDTH, height: GRID_HEIGHT, paletteColors: 20, outline: true },
  )

  return sharp(Buffer.from(pixelized.data), {
    raw: { width: pixelized.width, height: pixelized.height, channels: 4 },
  })
    .resize(CANVAS.width, CANVAS.height, { kernel: 'nearest' })
    .png()
    .toBuffer()
}
