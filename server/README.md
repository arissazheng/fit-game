# Fashion in Pixels server

Serves the game pages and runs live multiplayer rooms over WebSockets.

## Run it

```bash
cd server
npm install      # first time only
npm start
```

Open **http://localhost:3000**. The lobby puts a room code in the address bar (`?room=k7f2`).
Anyone who opens that link joins your room. **Copy invite link** in the lobby copies it.

Use a different port with `PORT=8080 npm start`.

## Play with friends on other computers

`localhost` only works on your own computer. To give friends a link:

- **Quick test:** run a tunnel while the server is running, then share the `https://...` link it prints
  (add your `?room=` code):
  - `npx cloudflared tunnel --url http://localhost:3000` (no account needed), or
  - `ngrok http 3000`
- **Always on:** deploy this folder to a Node host such as Render, Railway, or Fly.io.
  Start command `npm start`. The host sets `PORT` automatically. The game files are read from
  `../.claude/skills/pixel-ui`, so deploy the whole repo with `server` as the app directory.

## What the server does

- Rooms of up to 8 players, from the `?room=` code in the link.
- Players, names, avatars, and Ready states, shared live with everyone in the room.
- The host (first player in the room) can Start once everyone is ready. The server picks the theme
  and the timer's end time and sends the same round to everyone.
- Collects each player's outfit (on Lock in or at 0:00) and sends everyone's looks to the runway.
- A player who reloads or moves between pages keeps their spot for 20 seconds.

Nothing is saved to disk yet: restarting the server clears all rooms. Photos stay in each
player's browser.

Without this server (for example `python3 -m http.server`), the pages still work in
"this browser only" mode, where each tab is a player.
