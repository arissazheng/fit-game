// Fashion in Pixels — lobby room (prototype transport).
//
// Each browser tab is one player. Tabs on the same computer and browser find each other through
// BroadcastChannel, so you can test multiplayer by opening the lobby in 2+ tabs. To play across
// computers, replace the `transport` below with a WebSocket to a game server; the lobby page only
// uses joinRoom(), update(), start(), and the onChange / onStart callbacks.
//
//   var room = FIP.joinRoom({ me: { name, look, ready }, onChange: fn(players), onStart: fn(round) });
//   room.update({ ready: true });       // share changes to my player
//   room.start(round);                  // host only: send everyone to the outfit builder
//   room.players()                      // [{ id, name, look, ready, joinedAt, isMe, isHost }]
(function (root) {
  var FIP = root.FIP = root.FIP || {};
  var CHANNEL = 'fip-room-v1';
  var HEARTBEAT_MS = 1500, TIMEOUT_MS = 5000;
  FIP.MAX_PLAYERS = 8;

  function makeTransport(onMessage) {
    if (!('BroadcastChannel' in root)) return { send: function () {}, close: function () {} };
    var ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = function (e) { onMessage(e.data); };
    return { send: function (msg) { ch.postMessage(msg); }, close: function () { ch.close(); } };
  }

  FIP.joinRoom = function (opts) {
    var me = Object.assign({
      id: Math.random().toString(36).slice(2, 10),   // new id per page load, so duplicated tabs never collide
      joinedAt: Date.now(),
      name: '', look: {}, ready: false
    }, opts.me);
    var others = {};   // id -> player + lastSeen
    var onChange = opts.onChange || function () {};
    var onStart = opts.onStart || function () {};

    function publicMe() { return { id: me.id, joinedAt: me.joinedAt, name: me.name, look: me.look, ready: me.ready }; }
    function list() {
      var all = [Object.assign({ isMe: true }, publicMe())].concat(Object.keys(others).map(function (id) {
        return Object.assign({ isMe: false }, others[id].player);
      }));
      all.sort(function (a, b) { return a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1); });
      all.forEach(function (p, i) { p.isHost = i === 0; });
      return all;
    }
    function changed() { onChange(list()); }

    var transport = makeTransport(function (msg) {
      if (!msg || msg.from === me.id) return;
      if (msg.type === 'hello') { others[msg.from] = { player: msg.player, lastSeen: Date.now() }; send('state'); changed(); }
      if (msg.type === 'state') { others[msg.from] = { player: msg.player, lastSeen: Date.now() }; changed(); }
      if (msg.type === 'leave') { delete others[msg.from]; changed(); }
      if (msg.type === 'start') onStart(msg.round);
    });
    function send(type, extra) { transport.send(Object.assign({ type: type, from: me.id, player: publicMe() }, extra || {})); }

    var beat = setInterval(function () {
      send('state');
      var now = Date.now(), dropped = false;
      Object.keys(others).forEach(function (id) { if (now - others[id].lastSeen > TIMEOUT_MS) { delete others[id]; dropped = true; } });
      if (dropped) changed();
    }, HEARTBEAT_MS);
    root.addEventListener('pagehide', function () { send('leave'); clearInterval(beat); });

    send('hello');
    setTimeout(changed, 0);

    return {
      me: function () { return publicMe(); },
      players: list,
      update: function (patch) { Object.assign(me, patch); send('state'); changed(); },
      start: function (round) { send('start', { round: round }); onStart(round); }
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
