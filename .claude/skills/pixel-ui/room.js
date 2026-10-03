// Fashion in Pixels — multiplayer room client.
//
// When the pages are served by the game server (cd server && npm start), players on any computer
// join the same room over a WebSocket at /ws. Rooms come from the link: ?room=k7f2.
// When there is no game server (e.g. python3 -m http.server), it falls back to "local" mode where
// each browser tab is a player and tabs sync with BroadcastChannel.
//
// Lobby:
//   var room = FIP.joinRoom({ me: { name, look, ready }, onChange: fn(players), onStart: fn(round), onError: fn(msg) });
//   room.update({ ready: true });   room.start({ seconds: 60 });   room.players();   room.mode  // 'server' | 'local'
// Outfit builder / runway:
//   var game = FIP.connectGame({ onStart: fn(round), onOutfits: fn(msg), onRunway: fn(), onRoom: fn(msg) });   game.send({ type: 'outfit', outfit })
(function (root) {
  var FIP = root.FIP = root.FIP || {};
  FIP.MAX_PLAYERS = 8;
  var ss = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  // ---------- room code ----------
  FIP.roomId = function (create) {
    var fromUrl = new URLSearchParams(location.search).get('room');
    var id = (fromUrl || ss.get('fip.roomId') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24);
    if (!id && create) id = Math.random().toString(36).slice(2, 6);
    if (id) ss.set('fip.roomId', id);
    return id;
  };
  // Current page URL with ?room= set (keeps other params like ?seconds=10)
  FIP.withRoom = function (page) {
    var params = new URLSearchParams(location.search);
    var id = FIP.roomId();
    if (id) params.set('room', id);
    var q = params.toString();
    return page + (q ? '?' + q : '');
  };
  FIP.inviteLink = function () {
    return location.origin + location.pathname.replace(/[^/]*$/, '') + '?room=' + FIP.roomId(true);
  };

  // ---------- WebSocket helper ----------
  function openSocket(handlers) {
    if (!/^https?:$/.test(location.protocol)) { setTimeout(handlers.onFail, 0); return null; }
    var opened = false, closedByUs = false, ws;
    function connect() {
      try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); }
      catch (e) { handlers.onFail(); return; }
      ws.onopen = function () { opened = true; handlers.onOpen(); };
      ws.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (err) { return; } handlers.onMessage(m); };
      ws.onclose = function () {
        if (closedByUs) return;
        if (!opened) { handlers.onFail(); return; }
        if (handlers.onDisconnect) handlers.onDisconnect();
        setTimeout(connect, 1500);   // reconnect
      };
    }
    connect();
    root.addEventListener('pagehide', function () { closedByUs = true; if (ws) ws.close(); });
    return { send: function (m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); } };
  }

  // ---------- lobby room ----------
  FIP.joinRoom = function (opts) {
    var me = Object.assign({ id: ss.get('fip.playerId') || null, name: '', look: {}, ready: false }, opts.me);
    var onChange = opts.onChange || function () {}, onStart = opts.onStart || function () {}, onError = opts.onError || function () {};
    var roomId = FIP.roomId(true);
    var players = [Object.assign({ isMe: true, isHost: true, connected: true }, me)];
    var api = { mode: 'connecting', roomId: roomId };
    var sock, local;

    function emit() { onChange(api.players()); }
    api.players = function () {
      return players.map(function (p) { return p.isMe ? Object.assign({}, p, { name: me.name, look: me.look, ready: me.ready }) : p; });
    };
    api.me = function () { return me; };
    api.update = function (patch) {
      Object.assign(me, patch);
      if (api.mode === 'server') sock.send(Object.assign({ type: 'update' }, patch));
      else if (local) local.update(patch);
      emit();
    };
    api.start = function (o) {
      var seconds = (o && o.seconds) || 60;
      if (api.mode === 'server') { sock.send({ type: 'start', seconds: seconds }); return; }
      var t = FIP.pickTheme();
      if (local) local.start({ theme: t.theme, category: t.category, seconds: seconds, endsAt: Date.now() + seconds * 1000 + 1000 });
    };

    sock = openSocket({
      onOpen: function () {
        api.mode = 'server';
        sock.send({ type: 'join', room: roomId, id: me.id, name: me.name, look: me.look, ready: me.ready });
      },
      onMessage: function (m) {
        if (m.type === 'welcome') { me.id = m.id; ss.set('fip.playerId', m.id); }
        if (m.type === 'room') {
          players = m.players.map(function (p) { return Object.assign({}, p, { isMe: p.id === me.id }); });
          emit();
        }
        if (m.type === 'start') onStart(m.round);
        if (m.type === 'error') onError(m.message);
      },
      onDisconnect: function () { onError('Lost connection to the game server. Reconnecting...'); },
      onFail: function () { api.mode = 'local'; local = localRoom(me, function (list) { players = list; emit(); }, onStart); emit(); }
    });
    return api;
  };

  // ---------- local fallback: each tab is a player (BroadcastChannel) ----------
  function localRoom(me, setPlayers, onStart) {
    if (!('BroadcastChannel' in root)) return null;
    var ch = new BroadcastChannel('fip-room-v1:' + FIP.roomId(true));
    var myId = Math.random().toString(36).slice(2, 10), joinedAt = Date.now(), others = {};
    function pub() { return { id: myId, joinedAt: joinedAt, name: me.name, look: me.look, ready: me.ready }; }
    function list() {
      var all = [Object.assign({ isMe: true, connected: true }, pub())].concat(Object.keys(others).map(function (id) {
        return Object.assign({ isMe: false, connected: true }, others[id].player);
      }));
      all.sort(function (a, b) { return a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1); });
      all.forEach(function (p, i) { p.isHost = i === 0; });
      return all;
    }
    function send(type, extra) { ch.postMessage(Object.assign({ type: type, from: myId, player: pub() }, extra || {})); }
    ch.onmessage = function (e) {
      var m = e.data;
      if (!m || m.from === myId) return;
      if (m.type === 'hello' || m.type === 'state') others[m.from] = { player: m.player, lastSeen: Date.now() };
      if (m.type === 'hello') send('state');
      if (m.type === 'leave') delete others[m.from];
      if (m.type === 'start') { onStart(m.round); return; }
      setPlayers(list());
    };
    setInterval(function () {
      send('state');
      var now = Date.now(), dropped = false;
      Object.keys(others).forEach(function (id) { if (now - others[id].lastSeen > 5000) { delete others[id]; dropped = true; } });
      if (dropped) setPlayers(list());
    }, 1500);
    root.addEventListener('pagehide', function () { send('leave'); });
    send('hello');
    setPlayers(list());
    return {
      update: function () { send('state'); setPlayers(list()); },
      start: function (round) { send('start', { round: round }); onStart(round); }
    };
  }

  // ---------- outfit builder / runway connection ----------
  FIP.connectGame = function (handlers) {
    handlers = handlers || {};
    var api = { online: false, send: function () {} };
    var sock = openSocket({
      onOpen: function () {
        api.online = true;
        sock.send({ type: 'hello', room: FIP.roomId(), id: ss.get('fip.playerId') });
        if (handlers.onOpen) handlers.onOpen();
      },
      onMessage: function (m) {
        if (m.type === 'welcome') ss.set('fip.playerId', m.id);
        if (m.type === 'start' && handlers.onStart) handlers.onStart(m.round);
        if (m.type === 'outfits' && handlers.onOutfits) handlers.onOutfits(m);
        if (m.type === 'runway' && handlers.onRunway) handlers.onRunway();
        if (m.type === 'room' && handlers.onRoom) handlers.onRoom(m);
      },
      onFail: function () { api.online = false; if (handlers.onOffline) handlers.onOffline(); }
    });
    api.send = function (m) { if (sock) sock.send(m); };
    return api;
  };
})(typeof window !== 'undefined' ? window : globalThis);
