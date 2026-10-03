# API

Base URL in dev: `http://localhost:4000`. CORS is enabled for the client dev
origin (`http://localhost:5173`) with credentials.

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

## Avatar preview

### `POST /api/avatar/preview`

`application/json`: `{ "photoId": "<id from /api/uploads>" }`

> Stand-in for the real step-7 "user -> avatar" pipeline (skin/hair tinting,
> true back view). For now: cover-crops the photo to the avatar's aspect
> ratio and runs it through the same `pixelize()` module as everything else,
> so there's a real, visible photo -> pixel-avatar result. No DB row yet —
> regenerate on demand.

Response `200`:
```json
{ "url": "/assets/processed/<photoId>-body.png" }
```

Response `404` / `500`: friendly, player-facing `{ "error": "..." }`.

---

More endpoints are added here as each build step lands (extraction jobs,
inventory, wallet, marketplace, outfit scoring).
