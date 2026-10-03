import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { config } from '../config.ts'
import { pixelizeImage } from '../lib/pixelizeNode.ts'

/** Builds a synthetic gradient-in-a-circle PNG so this script needs no external fixture. */
async function makeSampleImage(size = 128): Promise<Buffer> {
  const data = new Uint8ClampedArray(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const dx = x - cx
      const dy = y - cy
      const inCircle = dx * dx + dy * dy <= radius * radius
      data[i] = Math.round((x / size) * 255)
      data[i + 1] = Math.round((y / size) * 255)
      data[i + 2] = 180
      data[i + 3] = inCircle ? 255 : 0
    }
  }

  return sharp(Buffer.from(data), { raw: { width: size, height: size, channels: 4 } })
    .png()
    .toBuffer()
}

async function main() {
  await mkdir(config.processedDir, { recursive: true })
  const sample = await makeSampleImage()
  const result = await pixelizeImage(sample, { width: 32, height: 32, paletteColors: 12, outline: true })
  const outPath = `${config.processedDir}/test-output.png`
  await writeFile(outPath, result)
  console.log('Wrote', outPath)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
