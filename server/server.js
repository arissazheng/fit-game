// Fashion in Pixels — game server.
//
// One process does two jobs:
//   1. Serves the game pages (lobby, outfit builder, runway) over HTTP.
//   2. Runs live rooms over a WebSocket at /ws: players, ready states, host start with a shared
//      theme + end time, and outfit submissions for the runway.
//
// Run:  cd server && npm install && npm start      then open http://localhost:3000
// Env:  PORT (default 3000), STATIC_DIR (default ../.claude/skills/pixel-ui)
//
// Message protocol (JSON):
//   client -> server
//     { type: 'join',  room, id?, name, look, ready }   lobby page entering a room
//     { type: 'hello', room, id }                        builder/runway page reattaching to its player
//     { type: 'update', name?, look?, ready? }
//     { type: 'start', seconds? }                        host only, everyone must be ready
//     { type: 'outfit', outfit }                         builder: lock in / time's up
//     { type: 'getOutfits' }                             runway
//   server -> client
//     { type: 'welcome', id, room }
//     { type: 'room', players: [{ id, name, look, ready, isHost, connected }], phase }
//     { type: 'start', round: { theme, category, endsAt, seconds } }
//     { type: 'outfits', round, outfits: [{ id, name, look, outfit }] }
//     { type: 'error', message }

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 3000;
const STATIC_DIR = path.resolve(__dirname, process.env.STATIC_DIR || '../.claude/skills/pixel-ui');
const MAX_PLAYERS = 8;
const DISCONNECT_GRACE_MS = 20000;   // keep a player while their browser moves between pages
const ROOM_IDLE_MS = 30 * 60 * 1000;

// Themes are shared with the browser (themes.js defines globalThis.FIP).
require(path.join(STATIC_DIR, 'themes.js'));
const THEMES = globalThis.FIP.THEMES;

// ---------- static files ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.join(STATIC_DIR, path.normalize(rel));
  if (!file.startsWith(STATIC_DIR + path.sep) || path.basename(file).startsWith('.') || file.endsWith('.md')) {
    res.writeHead(404); res.end('Not found'); return;
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ---------- rooms ----------
// room = { id, phase: 'lobby'|'building', players: Map<id, player>, round, outfits: Map<id, outfit>, recentThemes, touched }
// player = { id, name, look, ready, joinedAt, socket, connected, dropTimer }
const rooms = new Map();

function getRoom(id) {
  let room = rooms.get(id);
  if (!room) {
    room = { id, phase: 'lobby', players: new Map(), round: null, outfits: new Map(), recentThemes: [], touched: Date.now() };
    rooms.set(id, room);
  }
  room.touched = Date.now();
  return room;
}

function ordered(room) {
  return [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1));
}
function hostOf(room) {
  return ordered(room).find((p) => p.connected) || ordered(room)[0];
}

function send(socket, msg) {
  if (socket && socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
}
function broadcast(room, msg) {
  for (const p of room.players.values()) send(p.socket, msg);
}
function broadcastRoom(room) {
  const host = hostOf(room);
  broadcast(room, {
    type: 'room',
    phase: room.phase,
    players: ordered(room).map((p) => ({
      id: p.id, name: p.name, look: p.look, ready: p.ready, connected: p.connected, isHost: host && p.id === host.id
    }))
  });
}
function outfitsMsg(room) {
  return {
    type: 'outfits',
    round: room.round,
    outfits: [...room.outfits.entries()].map(([id, o]) => {
      const p = room.players.get(id);
      return { id, name: (p && p.name) || o.name || 'Player', look: (p && p.look) || o.look || {}, outfit: o.outfit };
    })
  };
}

function pickTheme(room) {
  const pool = THEMES.filter((t) => !room.recentThemes.includes(t.theme));
  const pick = pool[Math.floor(Math.random() * pool.length)];
  room.recentThemes.push(pick.theme);
  if (room.recentThemes.length > 50) room.recentThemes.shift();
  return pick;
}

// Back to the lobby once the round is over and someone returns to the lobby page.
function resetIfRoundOver(room) {
  if (room.phase === 'building' && room.round && Date.now() > room.round.endsAt + 3000) {
    room.phase = 'lobby';
    for (const p of room.players.values()) p.ready = false;
  }
}

const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);
function cleanLook(look) {
  look = look || {};
  const hex = (v) => (/^#[0-9a-f]{6}$/i.test(v) ? v : undefined);
  return { skin: hex(look.skin), hair: hex(look.hair), style: clean(look.style, 20) || undefined };
}

// ---------- sockets ----------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });

wss.on('connection', (socket) => {
  let room = null;
  let player = null;

  function attach(roomId, id, fields) {
    room = getRoom(clean(roomId, 24).toLowerCase() || 'main');
    const existing = id && room.players.get(id);
    if (existing && existing.connected && existing.socket !== socket) id = null;   // duplicated tab: new player
    player = id && room.players.get(id);
    if (!player) {
      if (room.players.size >= MAX_PLAYERS) { send(socket, { type: 'error', message: 'This room is full (8 players).' }); return false; }
      player = { id: crypto.randomBytes(6).toString('hex'), name: '', look: {}, ready: false, joinedAt: Date.now() };
      room.players.set(player.id, player);
    }
    clearTimeout(player.dropTimer);
    if (player.socket && player.socket !== socket) player.socket.close();
    player.socket = socket;
    player.connected = true;
    if (fields) Object.assign(player, fields);
    send(socket, { type: 'welcome', id: player.id, room: room.id });
    return true;
  }

  socket.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'join') {
      const r = getRoom(clean(msg.room, 24).toLowerCase() || 'main');
      resetIfRoundOver(r);
      if (r.phase !== 'lobby' && !(msg.id && r.players.has(msg.id))) {
        send(socket, { type: 'error', message: 'A round is in progress in this room. Try again in a minute.' });
        return;
      }
      if (!attach(msg.room, msg.id, { name: clean(msg.name, 16), look: cleanLook(msg.look), ready: !!msg.ready })) return;
      broadcastRoom(room);
      return;
    }

    if (msg.type === 'hello') {
      if (!attach(msg.room, msg.id)) return;
      if (room.phase === 'building' && room.round) send(socket, { type: 'start', round: room.round });
      broadcastRoom(room);
      return;
    }

    if (!room || !player) return;
    room.touched = Date.now();

    if (msg.type === 'update') {
      if ('name' in msg) player.name = clean(msg.name, 16);
      if ('look' in msg) player.look = cleanLook(msg.look);
      if ('ready' in msg) player.ready = !!msg.ready;
      broadcastRoom(room);
    }

    if (msg.type === 'start') {
      const host = hostOf(room);
      const connected = [...room.players.values()].filter((p) => p.connected);
      if (room.phase !== 'lobby') return send(socket, { type: 'error', message: 'The round already started.' });
      if (!host || host.id !== player.id) return send(socket, { type: 'error', message: 'Only the host can start the game.' });
      if (!connected.every((p) => p.ready)) return send(socket, { type: 'error', message: 'Everyone needs to press Ready first.' });
      const seconds = Math.min(300, Math.max(5, Number(msg.seconds) || 60));
      const t = pickTheme(room);
      room.round = { theme: t.theme, category: t.category, seconds, endsAt: Date.now() + seconds * 1000 + 1500 };
      room.phase = 'building';
      room.outfits = new Map();
      broadcast(room, { type: 'start', round: room.round });
      broadcastRoom(room);
    }

    if (msg.type === 'outfit') {
      const o = msg.outfit || {};
      room.outfits.set(player.id, {
        name: player.name, look: player.look,
        outfit: {
          top: clean(o.top, 40) || null, bottom: clean(o.bottom, 40) || null, dress: clean(o.dress, 40) || null,
          accessories: (Array.isArray(o.accessories) ? o.accessories : []).slice(0, 8).map((a) => clean(a, 40))
        }
      });
      broadcast(room, outfitsMsg(room));
    }

    if (msg.type === 'getOutfits') send(socket, outfitsMsg(room));
  });

  socket.on('close', () => {
    if (!room || !player || player.socket !== socket) return;
    player.connected = false;
    player.socket = null;
    const r = room, p = player;
    p.dropTimer = setTimeout(() => {
      r.players.delete(p.id);
      if (r.players.size === 0) rooms.delete(r.id); else broadcastRoom(r);
    }, DISCONNECT_GRACE_MS);
    broadcastRoom(r);
  });
});

// Forget rooms nobody has touched in a while.
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) if (now - room.touched > ROOM_IDLE_MS && ![...room.players.values()].some((p) => p.connected)) rooms.delete(id);
}, 60 * 1000).unref();

server.listen(PORT, () => {
  console.log(`Fashion in Pixels server running at http://localhost:${PORT}`);
  console.log(`Serving game files from ${STATIC_DIR}`);
});
