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

[![Devpost](https://img.shields.io/badge/Devpost-003B5C?style=for-the-badge&logo=devpost&logoColor=white)](https://devpost.com/software/fit-game-ncs1dj)
