# fit-game — Fashion in Pixels

```
npm install
npm run dev
```

That starts three things together:

| URL | What it is |
|---|---|
| **http://localhost:8080** | **The actual game.** Static HTML/CSS/JS under `.claude/skills/pixel-ui/` — lobby (`index.html`), outfit builder (`demo.html`), runway (`runway.html`). Open this. |
| http://localhost:4000 | The backend API (`/server`). See `API.md`. |
| http://localhost:5173 | Internal dev/test tooling only (`/client`) — e.g. `#/dev/pixelize`. Not the game. |

`/shared` holds the avatar spec (`avatarSpec.ts`, mirroring `.claude/skills/pixel-ui/avatar.js`'s
constants) and the isomorphic `pixelize()` module both the backend and the dev tooling use.
