import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CANVAS, SLOT_BOXES } from '@fit-game/shared'

const serverDir = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(serverDir, '..', '..', '..', 'client', 'public', 'assets', 'defaults')

/** Solid-fill placeholder for a slot box on an otherwise-transparent 64x128 canvas. */
async function makeSlotFill(slot: keyof typeof SLOT_BOXES, color: [number, number, number, number]) {
  const box = SLOT_BOXES[slot]
  const data = new Uint8ClampedArray(CANVAS.width * CANVAS.height * 4)

  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      const i = (y * CANVAS.width + x) * 4
      data[i] = color[0]
      data[i + 1] = color[1]
      data[i + 2] = color[2]
      data[i + 3] = color[3]
    }
  }

  return sharp(Buffer.from(data), { raw: { width: CANVAS.width, height: CANVAS.height, channels: 4 } })
    .png()
    .toBuffer()
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const tankTop = await makeSlotFill('top', [20, 20, 20, 255])
  const shorts = await makeSlotFill('bottom', [20, 20, 20, 255])

  await writeFile(path.join(outDir, 'tank-top.png'), tankTop)
  await writeFile(path.join(outDir, 'shorts.png'), shorts)

  console.log('Wrote default sprites to', outDir)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
