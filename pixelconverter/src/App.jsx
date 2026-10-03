import { useEffect, useRef, useState, useCallback } from 'react'
import { pixelateToCanvas, loadImageFromFile } from './lib/pixelate'
import './App.css'

const GRID_SIZE = 144
const COLOR_LEVELS = 5
const OUTPUT_SIZE = 432
const CIRCLE_MASK = true

function App() {
  const [sourceImg, setSourceImg] = useState(null)
  const [sourceUrl, setSourceUrl] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const { img, url } = await loadImageFromFile(file)
    setSourceImg(img)
    setSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }, [])

  useEffect(() => {
    if (!sourceImg || !canvasRef.current) return
    pixelateToCanvas(sourceImg, canvasRef.current, {
      gridSize: GRID_SIZE,
      colorLevels: COLOR_LEVELS,
      outputSize: OUTPUT_SIZE,
      circleMask: CIRCLE_MASK,
    })
  }, [sourceImg])

  const handleDownload = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = 'avatar.png'
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Pixel Avatar Converter</h1>
        <p>Upload a photo and turn it into a game-ready pixel avatar.</p>
      </header>

      <main className="layout">
        <div
          className={`dropzone ${isDragging ? 'dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            handleFile(e.dataTransfer.files[0])
          }}
        >
          {sourceUrl ? (
            <img src={sourceUrl} alt="Uploaded" className="source-preview" />
          ) : (
            <p>Drag & drop an image here, or click to choose a file</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        <div className="avatar-panel">
          <canvas ref={canvasRef} className="avatar-canvas" />
          {!sourceImg && <div className="avatar-placeholder">Avatar preview</div>}

          <button
            type="button"
            className="download-btn"
            disabled={!sourceImg}
            onClick={handleDownload}
          >
            Download avatar
          </button>
        </div>
      </main>
    </div>
  )
}

export default App
