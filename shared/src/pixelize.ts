/**
 * Pure, isomorphic pixel-art conversion. Operates on plain RGBA buffers so it
 * runs identically in the browser (canvas ImageData) and in Node (sharp raw
 * buffers) — no DOM or Node APIs are imported here. Platform adapters live in
 * client/src/dev/pixelize and server/src/lib/pixelizeNode.ts.
 */

export interface PixelBuffer {
  width: number
  height: number
  /** RGBA, 4 bytes per pixel, row-major. */
  data: Uint8ClampedArray
}

export interface PixelizeOptions {
  width: number
  height: number
  paletteColors?: number
  outline?: boolean
}

type RGB = [number, number, number]

export function nearestNeighborDownscale(
  src: PixelBuffer,
  targetWidth: number,
  targetHeight: number,
): PixelBuffer {
  const data = new Uint8ClampedArray(targetWidth * targetHeight * 4)

  for (let ty = 0; ty < targetHeight; ty++) {
    const sy = Math.min(src.height - 1, Math.floor(((ty + 0.5) * src.height) / targetHeight))
    for (let tx = 0; tx < targetWidth; tx++) {
      const sx = Math.min(src.width - 1, Math.floor(((tx + 0.5) * src.width) / targetWidth))
      const si = (sy * src.width + sx) * 4
      const ti = (ty * targetWidth + tx) * 4
      data[ti] = src.data[si]
      data[ti + 1] = src.data[si + 1]
      data[ti + 2] = src.data[si + 2]
      data[ti + 3] = src.data[si + 3]
    }
  }

  return { width: targetWidth, height: targetHeight, data }
}

function channelRanges(bucket: RGB[]): RGB {
  let minR = 255, minG = 255, minB = 255
  let maxR = 0, maxG = 0, maxB = 0
  for (const [r, g, b] of bucket) {
    if (r < minR) minR = r
    if (g < minG) minG = g
    if (b < minB) minB = b
    if (r > maxR) maxR = r
    if (g > maxG) maxG = g
    if (b > maxB) maxB = b
  }
  return [maxR - minR, maxG - minG, maxB - minB]
}

function averageColor(bucket: RGB[]): RGB {
  let r = 0, g = 0, b = 0
  for (const [pr, pg, pb] of bucket) {
    r += pr
    g += pg
    b += pb
  }
  const n = bucket.length
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}

/** Classic median-cut: repeatedly split the bucket with the widest channel range. */
function medianCutPalette(pixels: RGB[], maxColors: number): RGB[] {
  const buckets: RGB[][] = [pixels]

  while (buckets.length < maxColors) {
    let targetIndex = -1
    let largestRange = -1
    let splitChannel = 0

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i]
      if (bucket.length < 2) continue
      const ranges = channelRanges(bucket)
      const maxChannelRange = Math.max(ranges[0], ranges[1], ranges[2])
      if (maxChannelRange > largestRange) {
        largestRange = maxChannelRange
        targetIndex = i
        splitChannel = ranges.indexOf(maxChannelRange)
      }
    }

    if (targetIndex === -1) break // nothing left worth splitting

    const bucket = buckets[targetIndex]
    bucket.sort((a, b) => a[splitChannel] - b[splitChannel])
    const mid = Math.floor(bucket.length / 2)
    buckets.splice(targetIndex, 1, bucket.slice(0, mid), bucket.slice(mid))
  }

  return buckets.map(averageColor)
}

function nearestColorIndex(color: RGB, palette: RGB[]): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < palette.length; i++) {
    const [pr, pg, pb] = palette[i]
    const dr = color[0] - pr
    const dg = color[1] - pg
    const db = color[2] - pb
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

/**
 * Reduces the image to `paletteColors` colors via median-cut over opaque
 * pixels. Fully transparent pixels are left untouched and excluded from the
 * palette fit so empty space doesn't waste palette slots.
 */
export function quantizeMedianCut(buf: PixelBuffer, paletteColors: number): PixelBuffer {
  const { width, height, data } = buf
  const opaquePixels: RGB[] = []

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) opaquePixels.push([data[i], data[i + 1], data[i + 2]])
  }

  if (opaquePixels.length === 0) {
    return { width, height, data: new Uint8ClampedArray(data) }
  }

  const palette = medianCutPalette(opaquePixels, Math.max(1, paletteColors))
  const out = new Uint8ClampedArray(data.length)

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    out[i + 3] = a
    if (a === 0) {
      out[i] = data[i]
      out[i + 1] = data[i + 1]
      out[i + 2] = data[i + 2]
      continue
    }
    const idx = nearestColorIndex([data[i], data[i + 1], data[i + 2]], palette)
    const [r, g, b] = palette[idx]
    out[i] = r
    out[i + 1] = g
    out[i + 2] = b
  }

  return { width, height, data: out }
}

/** Dilates the alpha mask by 1px so the sprite reads clearly at small sizes. */
export function addOutline(
  buf: PixelBuffer,
  color: [number, number, number, number] = [26, 26, 26, 255],
): PixelBuffer {
  const { width, height, data } = buf
  const out = new Uint8ClampedArray(data)
  const alphaAt = (x: number, y: number) => data[(y * width + x) * 4 + 3]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      if (data[idx + 3] > 0) continue

      const hasOpaqueNeighbor =
        (x > 0 && alphaAt(x - 1, y) > 0) ||
        (x < width - 1 && alphaAt(x + 1, y) > 0) ||
        (y > 0 && alphaAt(x, y - 1) > 0) ||
        (y < height - 1 && alphaAt(x, y + 1) > 0)

      if (hasOpaqueNeighbor) {
        out[idx] = color[0]
        out[idx + 1] = color[1]
        out[idx + 2] = color[2]
        out[idx + 3] = color[3]
      }
    }
  }

  return { width, height, data: out }
}

export function pixelize(src: PixelBuffer, options: PixelizeOptions): PixelBuffer {
  const downscaled = nearestNeighborDownscale(src, options.width, options.height)
  const quantized = quantizeMedianCut(downscaled, options.paletteColors ?? 24)
  return options.outline === false ? quantized : addOutline(quantized)
}
