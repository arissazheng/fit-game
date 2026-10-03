# Fit Game

```
npm install
npm run dev
```

Open **http://localhost:4000** — that's the whole game. The backend (`/server`)
serves the frontend (`/frontend` — lobby, outfit builder, runway) directly
and exposes the API at `/api/*` on the same origin. See `API.md`.

`npm run dev:tools` (port 5173) is separate, internal dev/test tooling only
(`/client` — e.g. `#/dev/pixelize`), not part of the game.

`/shared` holds the avatar spec (`avatarSpec.ts`, mirroring
`/frontend/avatar.js`'s constants) and the isomorphic `pixelize()` module
both the backend and the dev tooling use.

## Deploy (shareable link)

Host on **Render**, not Vercel. The game needs one always-on Node server for its
multiplayer WebSockets and SQLite database; Vercel only runs short-lived functions,
so it fails with `500 FUNCTION_INVOCATION_FAILED`.

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New > Blueprint**, pick this repo. Render reads `render.yaml` (build `npm install --include=dev`,
   start `npm start`, free plan).
3. Click **Apply**. When the deploy finishes, open the `https://fit-game-xxxx.onrender.com` link,
   press **Copy invite link** in the lobby, and share it.

The free plan sleeps after 15 minutes idle (the first visit takes ~50 seconds to wake up) and
clears uploaded photos and the database on each redeploy.
