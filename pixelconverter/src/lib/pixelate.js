// Core image -> pixel-avatar conversion, done entirely on <canvas>.

/**
 * Draws `source` into a square center-cropped canvas at `gridSize`x`gridSize`,
 * then posterizes colors and upscales with nearest-neighbor so the result
 * reads as crisp, blocky pixel art at `outputSize`x`outputSize`.
 */
export function pixelateToCanvas(source, outputCanvas, options) {
  const { gridSize, colorLevels, outputSize, circleMask } = options

  // 1. Center-crop the source to a square.
  const srcSize = Math.min(source.width, source.height)
  const srcX = (source.width - srcSize) / 2
  const srcY = (source.height - srcSize) / 2

  // 2. Downsample into a tiny grid canvas (browser's smoothing acts like averaging).
  const gridCanvas = document.createElement('canvas')
  gridCanvas.width = gridSize
  gridCanvas.height = gridSize
  const gridCtx = gridCanvas.getContext('2d')
  gridCtx.imageSmoothingEnabled = true
  gridCtx.drawImage(source, srcX, srcY, srcSize, srcSize, 0, 0, gridSize, gridSize)

  // 3. Posterize each pixel's color channels to a fixed number of levels.
  const imageData = gridCtx.getImageData(0, 0, gridSize, gridSize)
  posterize(imageData.data, colorLevels)
  gridCtx.putImageData(imageData, 0, 0)

  // 4. Upscale to the final avatar size with nearest-neighbor for sharp pixels.
  outputCanvas.width = outputSize
  outputCanvas.height = outputSize
  const outCtx = outputCanvas.getContext('2d')
  outCtx.imageSmoothingEnabled = false
  outCtx.clearRect(0, 0, outputSize, outputSize)

  if (circleMask) {
    outCtx.save()
    outCtx.beginPath()
    outCtx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
    outCtx.clip()
  }

  outCtx.drawImage(gridCanvas, 0, 0, gridSize, gridSize, 0, 0, outputSize, outputSize)

  if (circleMask) {
    outCtx.restore()
  }
}

function posterize(data, levels) {
  if (levels >= 256) return
  const step = 255 / (levels - 1)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(Math.round(data[i] / step) * step)
    data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step)
    data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step)
  }
}

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = reject
    img.src = url
  })
}
