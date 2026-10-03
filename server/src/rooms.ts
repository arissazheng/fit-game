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
//     { type: 'vote', modelId, stars }                   runway: 1-5 stars for the player on the runway
//   server -> client
//     { type: 'welcome', id, room }
//     { type: 'room', players: [{ id, name, look, ready, isHost, connected }], phase }
//     { type: 'start', round: { theme, category, endsAt, seconds } }
//     { type: 'outfits', round, outfits: [{ id, name, look, outfit }] }
//     { type: 'runway' }                                 building is over: go to the runway page
//     { type: 'intro', startsAt, total, theme }           runway about to begin
//     { type: 'show', index, total, model, endsAt, votes, eligible, myVote, theme }   one player on the runway
//     { type: 'votes', modelId, votes, eligible }         vote progress for the current model
//     { type: 'voted', modelId, stars }                   your vote was saved
//     { type: 'podium', theme, results: [{ id, name, look, outfit, stars, votes, place }] }
//   Every timed message carries serverNow so browsers can correct for clock differences.
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
const RUNWAY_INTRO_MS = 3000 // time for everyone's browser to load the runway
const VOTE_MS = 10000 // voting time per player on the runway (always the full 10 seconds)

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
}

interface RunwayState {
  order: string[]
  index: number
  startsAt: number
  endsAt: number
  votes: Map<string, Map<string, number>>
  timer: ReturnType<typeof setTimeout> | null
}

interface PodiumResult {
  id: string
  name: string
  look: Look
  outfit: Partial<Outfit>
  stars: number
  votes: number
  place: number
}

interface PodiumMsg {
  type: 'podium'
  theme: string
  results: PodiumResult[]
}

interface Room {
  id: string
  phase: 'lobby' | 'building' | 'runway' | 'podium'
  players: Map<string, Player>
  round: Round | null
  outfits: Map<string, { name: string; look: Look; outfit: Outfit }>
  recentThemes: string[]
  touched: number
  roundTimer?: ReturnType<typeof setTimeout>
  runway: RunwayState | null
  results: PodiumMsg | null
}

const rooms = new Map<string, Room>()

function getRoom(id: string): Room {
  let room = rooms.get(id)
  if (!room) {
    room = {
      id, phase: 'lobby', players: new Map(), round: null, outfits: new Map(), recentThemes: [], touched: Date.now(),
      runway: null, results: null,
    }
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
function connectedPlayers(room: Room): Player[] {
  return [...room.players.values()].filter((p) => p.connected)
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

// ---------- round flow: building -> runway -> podium -> lobby ----------

// Once every connected player has locked in, end building early.
function checkAllLockedIn(room: Room) {
  if (room.phase !== 'building') return
  const connected = connectedPlayers(room)
  if (connected.length && connected.every((p) => room.outfits.has(p.id))) endBuilding(room)
}

function endBuilding(room: Room) {
  if (room.phase !== 'building' || !room.round) return
  clearTimeout(room.roundTimer)
  room.round.endsAt = Math.min(room.round.endsAt, Date.now())
  const order = [...room.outfits.keys()]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  room.phase = 'runway'
  room.runway = { order, index: -1, startsAt: Date.now() + RUNWAY_INTRO_MS, endsAt: 0, votes: new Map(), timer: null }
  broadcast(room, { type: 'runway' })
  broadcast(room, introMsg(room))
  room.runway.timer = setTimeout(() => nextModel(room), RUNWAY_INTRO_MS)
  broadcastRoom(room)
}

function introMsg(room: Room) {
  const rw = room.runway!
  return { type: 'intro', startsAt: rw.startsAt, total: rw.order.length, theme: room.round!.theme, serverNow: Date.now() }
}

function modelInfo(room: Room, id: string) {
  const o = room.outfits.get(id)
  const p = room.players.get(id)
  return { id, name: p?.name || o?.name || 'Player', look: p?.look || o?.look || {}, outfit: o?.outfit || {} }
}
// Everyone except the player on the runway votes. In a solo round, you rate your own look.
function eligibleVoters(room: Room, modelId: string): Player[] {
  const connected = connectedPlayers(room)
  const others = connected.filter((p) => p.id !== modelId)
  return others.length ? others : connected
}

function showMsg(room: Room, forId: string) {
  const rw = room.runway!
  const modelId = rw.order[rw.index]
  const votes = rw.votes.get(modelId) || new Map()
  return {
    type: 'show', index: rw.index, total: rw.order.length, model: modelInfo(room, modelId), theme: room.round!.theme,
    endsAt: rw.endsAt, votes: votes.size, eligible: eligibleVoters(room, modelId).length,
    canVote: eligibleVoters(room, modelId).some((p) => p.id === forId),
    myVote: votes.get(forId) || 0, serverNow: Date.now(),
  }
}
function broadcastShow(room: Room) {
  for (const p of room.players.values()) send(p.socket, showMsg(room, p.id))
}

function nextModel(room: Room) {
  if (room.phase !== 'runway' || !room.runway) return
  const rw = room.runway
  clearTimeout(rw.timer ?? undefined)
  rw.index += 1
  if (rw.index >= rw.order.length) { finishRunway(room); return }
  const modelId = rw.order[rw.index]
  rw.votes.set(modelId, new Map())
  rw.endsAt = Date.now() + VOTE_MS
  rw.timer = setTimeout(() => nextModel(room), rw.endsAt - Date.now())
  broadcastShow(room)
}

function finishRunway(room: Room) {
  const rw = room.runway!
  const results: PodiumResult[] = rw.order.map((id) => {
    const votes = rw.votes.get(id) || new Map()
    let stars = 0
    for (const v of votes.values()) stars += v
    return { ...modelInfo(room, id), stars, votes: votes.size, place: 0 }
  })
  results.sort((a, b) => b.stars - a.stars || b.votes - a.votes)
  results.forEach((r, i) => { r.place = i > 0 && r.stars === results[i - 1].stars ? results[i - 1].place : i + 1 })
  room.phase = 'podium'
  room.results = { type: 'podium', theme: room.round!.theme, results }
  broadcast(room, room.results)
  broadcastRoom(room)
}

// Back to the lobby once the podium has been shown and someone returns to the lobby page.
function resetIfRoundOver(room: Room) {
  if (room.phase === 'podium') {
    room.phase = 'lobby'
    room.runway = null
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
        const r = room!
        if (r.phase === 'building' && r.round) send(socket, { type: 'start', round: r.round, serverNow: Date.now() })
        if (r.phase === 'runway' || r.phase === 'podium') send(socket, { type: 'runway' })
        if (r.phase === 'runway' && r.runway) send(socket, r.runway.index < 0 ? introMsg(r) : showMsg(r, player!.id))
        if (r.phase === 'podium' && r.results) send(socket, r.results)
        broadcastRoom(r)
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
        const connected = connectedPlayers(room)
        if (room.phase !== 'lobby') { send(socket, { type: 'error', message: 'The round already started.' }); return }
        if (!host || host.id !== player.id) { send(socket, { type: 'error', message: 'Only the host can start the game.' }); return }
        if (!connected.every((p) => p.ready)) { send(socket, { type: 'error', message: 'Everyone needs to press Ready first.' }); return }
        const seconds = Math.min(300, Math.max(5, Number(msg.seconds) || 60))
        const t = pickTheme(room)
        room.round = { theme: t.theme, category: t.category, seconds, endsAt: Date.now() + seconds * 1000 + 1500 }
        room.phase = 'building'
        room.outfits = new Map()
        clearTimeout(room.roundTimer)
        // Time's up: browsers auto-submit at 0:00, so allow a moment for late outfits to arrive.
        room.roundTimer = setTimeout(() => endBuilding(room!), room.round.endsAt - Date.now() + 2500)
        broadcast(room, { type: 'start', round: room.round, serverNow: Date.now() })
        broadcastRoom(room)
      }

      if (msg.type === 'outfit') {
        if (room.phase !== 'building') return
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

      if (msg.type === 'vote') {
        const rw = room.runway
        if (room.phase !== 'runway' || !rw || rw.index < 0) return
        const modelId = rw.order[rw.index]
        const stars = Math.round(Number(msg.stars))
        if (msg.modelId !== modelId || Date.now() > rw.endsAt || !(stars >= 1 && stars <= 5)) return
        if (!eligibleVoters(room, modelId).some((p) => p.id === player!.id)) return
        rw.votes.get(modelId)!.set(player.id, stars)
        broadcast(room, { type: 'votes', modelId, votes: rw.votes.get(modelId)!.size, eligible: eligibleVoters(room, modelId).length })
        send(socket, { type: 'voted', modelId, stars })
      }
    })

    socket.on('close', () => {
      if (!room || !player || player.socket !== socket) return
      player.connected = false
      player.socket = null
      const r = room
      const p = player
      checkAllLockedIn(r)
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
