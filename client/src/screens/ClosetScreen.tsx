import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE } from '../apiBase'
import './ClosetScreen.css'

interface Photo {
  id: string
  name: string
  blobUrl: string
  status: 'uploading' | 'done' | 'error'
}

const MAX_PHOTOS = 10

export function ClosetScreen() {
  const containerRef = useRef<HTMLDivElement>(null)
  const photosRef = useRef<Photo[]>([])
  const [theme] = useState(() => window.FIP.pickTheme())
  const [photos, setPhotos] = useState<Photo[]>([])
  const [statusMsg, setStatusMsg] = useState('Ready')

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  // pixel-ui.js's dropzone already wires click/drop/keydown on the input itself and
  // dispatches a "px-files" event with the resulting File list (data-preview="none"
  // skips its own inline preview) — listen for that instead of duplicating
  // onChange/onDrop, which would race with its own listener on the same input.
  const handlePhotoFiles = useCallback(async (files: File[]) => {
    const room = MAX_PHOTOS - photosRef.current.length
    const added = files.slice(0, room)
    const skipped = files.length - added.length

    if (added.length === 0) {
      setStatusMsg(`Closet is full: ${files.length} photo${files.length === 1 ? '' : 's'} skipped (max 10)`)
      return
    }

    const newPhotos: Photo[] = added.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      blobUrl: URL.createObjectURL(file),
      status: 'uploading',
    }))
    setPhotos((prev) => [...prev, ...newPhotos])
    setStatusMsg(
      skipped
        ? `Closet is full: ${skipped} photo${skipped === 1 ? '' : 's'} skipped (max 10)`
        : `Uploading ${added.length} ${added.length === 1 ? 'photo' : 'photos'}…`,
    )

    const formData = new FormData()
    added.forEach((file) => formData.append('photos', file))

    try {
      const res = await fetch(`${API_BASE}/api/uploads`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      const ids = newPhotos.map((p) => p.id)
      setPhotos((prev) =>
        prev.map((p) => {
          const idx = ids.indexOf(p.id)
          return idx === -1 ? p : { ...p, status: 'done' }
        }),
      )
      setStatusMsg(`${added.length} ${added.length === 1 ? 'photo' : 'photos'} added to your closet`)
    } catch (err) {
      console.error(err)
      const ids = newPhotos.map((p) => p.id)
      setPhotos((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, status: 'error' } : p)))
      setStatusMsg("Couldn't upload your photos — try again?")
    }
  }, [])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    window.PixelUI.init(root)

    const zone = root.querySelector('.upload-drop')
    const onPxFiles = (e: Event) => {
      handlePhotoFiles((e as CustomEvent<{ files: File[] }>).detail.files)
    }
    zone?.addEventListener('px-files', onPxFiles)
    return () => zone?.removeEventListener('px-files', onPxFiles)
  }, [handlePhotoFiles])

  return (
    <div ref={containerRef}>
      <div className="px-desktop">
        <div className="px-desktop__icons">
          <button className="px-icon">
            <span style={{ fontSize: 36 }}>📄</span>
            <span>readme</span>
          </button>
          <button className="px-icon" aria-selected="true">
            <span style={{ fontSize: 36 }}>👗</span>
            <span>Closet</span>
          </button>
          <button className="px-icon">
            <span style={{ fontSize: 36 }}>🛍️</span>
            <span>Market</span>
          </button>
        </div>

        <div className="px-window px-window--main">
          <div className="px-titlebar">
            <span>FASHION IN PIXELS v1.0</span>
            <span className="px-titlebar__controls">
              <button aria-label="Minimize">_</button>
              <button aria-label="Maximize">□</button>
              <button aria-label="Close">×</button>
            </span>
          </div>
          <nav className="px-menubar">
            <button>File(F)</button>
            <button>Edit(E)</button>
            <button>View(V)</button>
            <button>Help(H)</button>
          </nav>

          <div className="px-window__body cols">
            <div className="left">
              <div className="px-window">
                <div className="px-titlebar">
                  <span>Closet.exe</span>
                  <span className="px-titlebar__controls">
                    <button>_</button>
                    <button>□</button>
                    <button>×</button>
                  </span>
                </div>
                <div className="px-window__body">
                  <div className="px-tabs" role="tablist" aria-label="Closet categories">
                    <button className="px-tab" role="tab" id="tab-tops" aria-controls="panel-tops" aria-selected="true">
                      Tops
                    </button>
                    <button className="px-tab" role="tab" id="tab-bottoms" aria-controls="panel-bottoms">
                      Bottoms
                    </button>
                    <button className="px-tab" role="tab" id="tab-dresses" aria-controls="panel-dresses">
                      Dresses
                    </button>
                    <button className="px-tab" role="tab" id="tab-acc" aria-controls="panel-acc">
                      Acc
                    </button>
                  </div>
                  <div className="px-tabpanel" role="tabpanel" id="panel-tops" aria-labelledby="tab-tops">
                    <div className="slots">
                      <button className="px-slot" title="White tee" aria-label="White tee">
                        <span className="item">👕</span>
                      </button>
                      <button className="px-slot" title="Pink blouse" aria-label="Pink blouse" aria-selected="true">
                        <span className="item">👚</span>
                      </button>
                      <button className="px-slot" title="Denim jacket" aria-label="Denim jacket">
                        <span className="item">🧥</span>
                      </button>
                      <button className="px-slot" title="Black tank top" aria-label="Black tank top">
                        <span className="item">🎽</span>
                      </button>
                    </div>
                  </div>
                  <div className="px-tabpanel" role="tabpanel" id="panel-bottoms" aria-labelledby="tab-bottoms" hidden>
                    <div className="slots">
                      <button className="px-slot" title="Baggy jeans" aria-label="Baggy jeans">
                        <span className="item">👖</span>
                      </button>
                      <button className="px-slot" title="Black shorts" aria-label="Black shorts">
                        <span className="item">🩳</span>
                      </button>
                    </div>
                  </div>
                  <div className="px-tabpanel" role="tabpanel" id="panel-dresses" aria-labelledby="tab-dresses" hidden>
                    <div className="slots">
                      <button className="px-slot" title="Slip dress" aria-label="Slip dress">
                        <span className="item">👗</span>
                      </button>
                      <button className="px-slot" title="Kimono dress" aria-label="Kimono dress">
                        <span className="item">👘</span>
                      </button>
                      <button className="px-slot" title="Sari" aria-label="Sari">
                        <span className="item">🥻</span>
                      </button>
                    </div>
                  </div>
                  <div className="px-tabpanel" role="tabpanel" id="panel-acc" aria-labelledby="tab-acc" hidden>
                    <div className="slots">
                      <button className="px-slot" title="Shoulder bag" aria-label="Shoulder bag">
                        <span className="item">👜</span>
                      </button>
                      <button className="px-slot" title="Sunglasses" aria-label="Sunglasses">
                        <span className="item">🕶️</span>
                      </button>
                      <button className="px-slot" title="Cap" aria-label="Cap">
                        <span className="item">🧢</span>
                      </button>
                      <button className="px-slot" title="Ring" aria-label="Ring">
                        <span className="item">💍</span>
                      </button>
                      <button className="px-slot" title="Hair bow" aria-label="Hair bow">
                        <span className="item">🎀</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-window">
                <div className="px-titlebar">
                  <span>Upload.exe</span>
                  <span className="px-titlebar__controls">
                    <button>_</button>
                    <button>□</button>
                    <button>×</button>
                  </span>
                </div>
                <div className="px-window__body">
                  <span className="px-label">
                    Your photos <span>{photos.length} / {MAX_PHOTOS}</span>
                  </span>
                  <div
                    className="px-well px-dropzone upload-drop"
                    data-preview="none"
                    aria-label="Upload outfit photos"
                  >
                    <input type="file" accept="image/*" multiple />
                    <div className="px-well__empty">
                      🖼
                      <br />
                      Drag &amp; Drop
                      <br />
                      or Click
                    </div>
                  </div>
                  <div className="thumbs">
                    {photos.map((photo) => (
                      <div key={photo.id} className="px-slot" title={photo.name}>
                        <img src={photo.blobUrl} alt={photo.name} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-window stage-win">
              <div className="px-titlebar">
                <span>THEME: {theme.theme}</span>
                <span className="px-titlebar__controls">
                  <button>_</button>
                  <button>□</button>
                  <button>×</button>
                </span>
              </div>
              <div className="px-window__body">
                <div className="px-progress" style={{ ['--value' as string]: 0.65 }}>
                  <i />
                </div>
                <div className="px-well px-dropzone stage" aria-label="Outfit preview">
                  <div className="px-well__empty">
                    🖼
                    <br />
                    Drag &amp; Drop
                    <br />
                    or Click
                  </div>
                </div>
                <button className="px-btn px-btn--wide">↓ Lock in outfit</button>
              </div>
            </div>
          </div>

          <div className="px-statusbar">
            <span>{statusMsg}</span>
            <span>0:39</span>
            <span>120 coins</span>
          </div>
        </div>
      </div>

      <div className="px-taskbar">
        <button className="px-btn">▤ Start</button>
        <button className="px-btn px-taskbar__task">📄 readme</button>
        <button className="px-btn px-taskbar__task" aria-pressed="true">
          👗 Closet.exe
        </button>
        <span className="px-taskbar__tray">🔈 17:13</span>
      </div>
    </div>
  )
}
