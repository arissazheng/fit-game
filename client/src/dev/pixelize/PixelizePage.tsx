import { useEffect, useRef, useState } from 'react'
import { pixelize } from '@fit-game/shared'
import { imageToPixelBuffer, loadImageFile, pixelBufferToDataUrl } from './pixelizeBrowser'

export function PixelizePage() {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [gridSize, setGridSize] = useState(48)
  const [paletteColors, setPaletteColors] = useState(24)
  const [outline, setOutline] = useState(true)
  const bufferRef = useRef<ReturnType<typeof imageToPixelBuffer> | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    const img = await loadImageFile(file)
    bufferRef.current = imageToPixelBuffer(img)
    setSourceUrl(URL.createObjectURL(file))
  }

  useEffect(() => {
    const buffer = bufferRef.current
    if (!buffer) return
    const result = pixelize(buffer, { width: gridSize, height: gridSize, paletteColors, outline })
    setResultUrl(pixelBufferToDataUrl(result))
  }, [sourceUrl, gridSize, paletteColors, outline])

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>pixelize dev page</h1>
      <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} />

      <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
        <label>
          Grid size: {gridSize}
          <input
            type="range"
            min={8}
            max={128}
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
          />
        </label>
        <label>
          Palette colors: {paletteColors}
          <input
            type="range"
            min={2}
            max={64}
            value={paletteColors}
            onChange={(e) => setPaletteColors(Number(e.target.value))}
          />
        </label>
        <label>
          <input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} />
          Outline
        </label>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        <div>
          <h2>Before</h2>
          {sourceUrl && <img src={sourceUrl} alt="source" style={{ maxWidth: 320, maxHeight: 320 }} />}
        </div>
        <div>
          <h2>After</h2>
          {resultUrl && (
            <img
              src={resultUrl}
              alt="pixelized"
              style={{ width: 320, height: 320, imageRendering: 'pixelated' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
