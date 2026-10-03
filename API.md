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

More endpoints are added here as each build step lands (uploads, extraction
jobs, inventory, wallet, marketplace, outfit scoring).
