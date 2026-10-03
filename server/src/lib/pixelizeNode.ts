import sharp from 'sharp'
import { pixelize, type PixelizeOptions } from '@fit-game/shared'

/** Node-side adapter: decodes/encodes with sharp, runs the shared pure pixelize core in between. */
export async function pixelizeImage(input: Buffer, options: PixelizeOptions): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const result = pixelize(
    { width: info.width, height: info.height, data: new Uint8ClampedArray(data) },
    options,
  )

  return sharp(Buffer.from(result.data), {
    raw: { width: result.width, height: result.height, channels: 4 },
  })
    .png()
    .toBuffer()
}
