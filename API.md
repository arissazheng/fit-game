# API

Base URL in dev: `http://localhost:4000` — the backend serves the frontend
(`/frontend`) directly from the same origin, so API calls from the game are
same-origin fetches to relative paths (`/api/...`). CORS still reflects the
request's `Origin` (with credentials) as a fallback for anything hitting the
API from elsewhere.

Static sprite files are served under `/assets/...` (see each section for the
exact prefix).

## Health

### `GET /api/health`

Response `200`:
```json
{ "ok": true }
```

---

## Uploads

### `POST /api/uploads`

`multipart/form-data`, field name `photos` (up to 10 files, 15MB each,
images only). Saved to `/data/uploads` and served back at
`/assets/uploads/<filename>`.

> Not auth-gated yet — every upload is attributed to a fixed dev user until
> step 8 (auth) lands.

Response `200`:
```json
{
  "uploads": [
    { "id": "b3f1...", "url": "/assets/uploads/b3f1....jpg", "originalName": "img.jpg", "sizeBytes": 123456 }
  ]
}
```

Response `400` (friendly, player-facing):
```json
{ "error": "You can upload up to 10 photos at a time." }
```

---

## Avatar

The live prototype's avatar (`/frontend/avatar.js`) is a
procedural chibi renderer driven by a `Look` (skin/hair/hairstyle, picked in
the lobby) and an `Outfit` (`top`/`bottom`/`dress`/`accessories`, as free-text
item names — colored by keyword match "until real extracted sprites replace
them"). `shared/src/avatarSpec.ts` mirrors its constants (`SKIN_TONES`,
`HAIR_COLORS`, `HAIRSTYLES`, `CANVAS`) and the dress/top/bottom exclusivity
rule (`applyEquip`) for any backend code that needs them. There's no
sprite-compositing endpoint — the avatar itself has no server-side
representation yet. That arrives with step 5/6 (real extracted garment
sprites) and step 7 (persisted user avatars).

Photos uploaded via `/api/uploads` are already wired into
`game.js`'s `FIP.mountUpload` (fire-and-forget, alongside its existing
localStorage persistence) so they survive beyond one browser.

---

More endpoints are added here as each build step lands (extraction jobs,
inventory, wallet, marketplace, outfit scoring).
