// Multiplayer rooms over WebSocket at /ws — ported as-is (same protocol, same
// behavior) from the prototype's standalone server.js into this process, so
// there's one server instead of two. Client: frontend/room.js.
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
//     { type: 'runway' }                                 everyone locked in: go to the runway now
//     { type: 'error', message }

import { randomBytes } from 'node:crypto'
import type { Server } from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'
import { WebSocketServer, type WebSocket } from 'ws'
import { config } from './config.ts'

const MAX_PLAYERS = 8
const DISCONNECT_GRACE_MS = 20000 // keep a player while their browser moves between pages
const ROOM_IDLE_MS = 30 * 60 * 1000

// themes.js is plain browser JS (attaches globalThis.FIP) — reuse it as-is rather
// than duplicating the theme list server-side.
const require = createRequire(import.meta.url)
require(path.join(config.frontendDir, 'themes.js'))
const THEMES = (globalThis as unknown as { FIP: { THEMES: { theme: string; category: string }[] } }).FIP.THEMES

interface Look {
  skin?: string
  hair?: string
  style?: string
}

interface Outfit {
  top: string | null
  bottom: string | null
  dress: string | null
  accessories: string[]
}

interface Player {
  id: string
  name: string
  look: Look
  ready: boolean
  joinedAt: number
  socket: WebSocket | null
  connected: boolean
  dropTimer?: ReturnType<typeof setTimeout>
}

interface Round {
  theme: string
  category: string
  seconds: number
  endsAt: number
  endedEarly?: boolean
}

interface Room {
  id: string
  phase: 'lobby' | 'building'
  players: Map<string, Player>
  round: Round | null
  outfits: Map<string, { name: string; look: Look; outfit: Outfit }>
  recentThemes: string[]
  touched: number
}

const rooms = new Map<string, Room>()

function getRoom(id: string): Room {
  let room = rooms.get(id)
  if (!room) {
    room = { id, phase: 'lobby', players: new Map(), round: null, outfits: new Map(), recentThemes: [], touched: Date.now() }
    rooms.set(id, room)
  }
  room.touched = Date.now()
  return room
}

function ordered(room: Room): Player[] {
  return [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1))
}
function hostOf(room: Room): Player | undefined {
  return ordered(room).find((p) => p.connected) || ordered(room)[0]
}

function send(socket: WebSocket | null | undefined, msg: unknown) {
  if (socket && socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg))
}
function broadcast(room: Room, msg: unknown) {
  for (const p of room.players.values()) send(p.socket, msg)
}
function broadcastRoom(room: Room) {
  const host = hostOf(room)
  broadcast(room, {
    type: 'room',
    phase: room.phase,
    players: ordered(room).map((p) => ({
      id: p.id, name: p.name, look: p.look, ready: p.ready, connected: p.connected, isHost: !!host && p.id === host.id,
    })),
  })
}
function outfitsMsg(room: Room) {
  return {
    type: 'outfits',
    round: room.round,
    outfits: [...room.outfits.entries()].map(([id, o]) => {
      const p = room.players.get(id)
      return { id, name: p?.name || o.name || 'Player', look: p?.look || o.look || {}, outfit: o.outfit }
    }),
  }
}

function pickTheme(room: Room) {
  const pool = THEMES.filter((t) => !room.recentThemes.includes(t.theme))
  const pick = pool[Math.floor(Math.random() * pool.length)]
  room.recentThemes.push(pick.theme)
  if (room.recentThemes.length > 50) room.recentThemes.shift()
  return pick
}

// Once every connected player has locked in, end the round early and send everyone to the runway.
function checkAllLockedIn(room: Room) {
  if (room.phase !== 'building' || !room.round || room.round.endedEarly) return
  const connected = [...room.players.values()].filter((p) => p.connected)
  if (connected.length === 0 || !connected.every((p) => room.outfits.has(p.id))) return
  room.round.endedEarly = true
  room.round.endsAt = Math.min(room.round.endsAt, Date.now())
  broadcast(room, { type: 'runway' })
}

// Back to the lobby once the round is over and someone returns to the lobby page.
function resetIfRoundOver(room: Room) {
  if (room.phase === 'building' && room.round && (room.round.endedEarly || Date.now() > room.round.endsAt + 3000)) {
    room.phase = 'lobby'
    for (const p of room.players.values()) p.ready = false
  }
}

function clean(s: unknown, n: number): string {
  return String(s ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n)
}
function cleanLook(look: Look | undefined | null): Look {
  look = look || {}
  const hex = (v: string | undefined) => (v && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined)
  return { skin: hex(look.skin), hair: hex(look.hair), style: clean(look.style, 20) || undefined }
}

export function attachRooms(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: 64 * 1024 })

  wss.on('connection', (socket: WebSocket) => {
    let room: Room | null = null
    let player: Player | null = null

    function attach(roomId: string, id: string | null | undefined, fields?: Partial<Player>): boolean {
      room = getRoom(clean(roomId, 24).toLowerCase() || 'main')
      const existing = id ? room.players.get(id) : undefined
      if (existing && existing.connected && existing.socket !== socket) id = null // duplicated tab: new player
      player = (id && room.players.get(id)) || null
      if (!player) {
        if (room.players.size >= MAX_PLAYERS) {
          send(socket, { type: 'error', message: 'This room is full (8 players).' })
          return false
        }
        player = { id: randomBytes(6).toString('hex'), name: '', look: {}, ready: false, joinedAt: Date.now(), socket: null, connected: false }
        room.players.set(player.id, player)
      }
      clearTimeout(player.dropTimer)
      if (player.socket && player.socket !== socket) player.socket.close()
      player.socket = socket
      player.connected = true
      if (fields) Object.assign(player, fields)
      send(socket, { type: 'welcome', id: player.id, room: room.id })
      return true
    }

    socket.on('message', (raw: Buffer) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        return
      }
      if (!msg || typeof msg.type !== 'string') return

      if (msg.type === 'join') {
        const r = getRoom(clean(msg.room, 24).toLowerCase() || 'main')
        resetIfRoundOver(r)
        if (r.phase !== 'lobby' && !(msg.id && r.players.has(msg.id as string))) {
          send(socket, { type: 'error', message: 'A round is in progress in this room. Try again in a minute.' })
          return
        }
        if (!attach(msg.room as string, msg.id as string, { name: clean(msg.name, 16), look: cleanLook(msg.look as Look), ready: !!msg.ready })) return
        broadcastRoom(room!)
        return
      }

      if (msg.type === 'hello') {
        if (!attach(msg.room as string, msg.id as string)) return
        if (room!.phase === 'building' && room!.round) send(socket, { type: 'start', round: room!.round })
        if (room!.round?.endedEarly) send(socket, { type: 'runway' })
        broadcastRoom(room!)
        return
      }

      if (!room || !player) return
      room.touched = Date.now()

      if (msg.type === 'update') {
        if ('name' in msg) player.name = clean(msg.name, 16)
        if ('look' in msg) player.look = cleanLook(msg.look as Look)
        if ('ready' in msg) player.ready = !!msg.ready
        broadcastRoom(room)
      }

      if (msg.type === 'start') {
        resetIfRoundOver(room)
        const host = hostOf(room)
        const connected = [...room.players.values()].filter((p) => p.connected)
        if (room.phase !== 'lobby') { send(socket, { type: 'error', message: 'The round already started.' }); return }
        if (!host || host.id !== player.id) { send(socket, { type: 'error', message: 'Only the host can start the game.' }); return }
        if (!connected.every((p) => p.ready)) { send(socket, { type: 'error', message: 'Everyone needs to press Ready first.' }); return }
        const seconds = Math.min(300, Math.max(5, Number(msg.seconds) || 60))
        const t = pickTheme(room)
        room.round = { theme: t.theme, category: t.category, seconds, endsAt: Date.now() + seconds * 1000 + 1500 }
        room.phase = 'building'
        room.outfits = new Map()
        broadcast(room, { type: 'start', round: room.round })
        broadcastRoom(room)
      }

      if (msg.type === 'outfit') {
        const o = (msg.outfit as Partial<Outfit>) || {}
        room.outfits.set(player.id, {
          name: player.name,
          look: player.look,
          outfit: {
            top: clean(o.top, 40) || null,
            bottom: clean(o.bottom, 40) || null,
            dress: clean(o.dress, 40) || null,
            accessories: (Array.isArray(o.accessories) ? o.accessories : []).slice(0, 8).map((a) => clean(a, 40)),
          },
        })
        broadcast(room, outfitsMsg(room))
        checkAllLockedIn(room)
      }

      if (msg.type === 'getOutfits') send(socket, outfitsMsg(room))
    })

    socket.on('close', () => {
      if (!room || !player || player.socket !== socket) return
      player.connected = false
      player.socket = null
      const r = room
      const p = player
      p.dropTimer = setTimeout(() => {
        r.players.delete(p.id)
        if (r.players.size === 0) rooms.delete(r.id)
        else { broadcastRoom(r); checkAllLockedIn(r) }
      }, DISCONNECT_GRACE_MS)
      broadcastRoom(r)
    })
  })

  // Forget rooms nobody has touched in a while.
  setInterval(() => {
    const now = Date.now()
    for (const [id, room] of rooms) {
      if (now - room.touched > ROOM_IDLE_MS && ![...room.players.values()].some((p) => p.connected)) rooms.delete(id)
    }
  }, 60 * 1000).unref()

  console.log('Multiplayer rooms listening at /ws')
}
