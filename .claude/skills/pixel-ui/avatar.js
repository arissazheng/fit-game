// Fashion in Pixels — chibi pixel avatar renderer.
//
// Every avatar shares one body shape on a 64x96 canvas (big head, small body, closed happy eyes,
// blush, dark pixel outline). Players customize skin tone, hair color, and hairstyle.
// Clothes are drawn on top from item names until real extracted sprites replace them.
//
//   FIPAvatar.render(canvas, look, outfit)
//     look   = { skin: '#f6cfb5', hair: '#3b2219', style: 'braids' }
//     outfit = { top, bottom, dress, accessories: [] }  (item names; omit for the plain lobby outfit)
//
// Layer order (back to front): back hair -> body -> shoes -> bottom -> top/dress -> face -> front hair -> accessories.
(function (root) {
  var W = 64, H = 96;

  var SKIN_TONES = [
    { name: 'Porcelain', hex: '#fde3d3' }, { name: 'Light', hex: '#f6cfb5' }, { name: 'Warm', hex: '#e8b48f' },
    { name: 'Tan', hex: '#c98d63' }, { name: 'Brown', hex: '#9a6240' }, { name: 'Deep', hex: '#6b4029' }
  ];
  var HAIR_COLORS = [
    { name: 'Espresso', hex: '#3b2219' }, { name: 'Black', hex: '#1e1a1d' }, { name: 'Chestnut', hex: '#6e3f24' },
    { name: 'Honey', hex: '#c58a3f' }, { name: 'Blonde', hex: '#e8cf7a' }, { name: 'Ginger', hex: '#c45a2a' },
    { name: 'Pink', hex: '#f0a3bf' }, { name: 'Lilac', hex: '#b49ad8' }, { name: 'Silver', hex: '#c9c9d1' },
    { name: 'Blue', hex: '#5b7fd1' }
  ];
  var HAIRSTYLES = [
    { id: 'long', name: 'Long' }, { id: 'braids', name: 'Braids' }, { id: 'bob', name: 'Bob' },
    { id: 'short', name: 'Short' }, { id: 'buns', name: 'Space buns' }, { id: 'ponytail', name: 'Ponytail' }
  ];
  var DEFAULT_LOOK = { skin: SKIN_TONES[1].hex, hair: HAIR_COLORS[0].hex, style: 'braids' };

  // ---------- tiny pixel rasterizer ----------
  function layer() { return new Uint8Array(W * H); }
  function put(l, x, y, v) { if (x >= 0 && x < W && y >= 0 && y < H) l[y * W + x] = v; }
  function rect(l, x, y, w, h, v) {
    for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) put(l, i, j, v === undefined ? 1 : v);
  }
  function ellipse(l, cx, cy, rx, ry, v) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) put(l, x, y, v === undefined ? 1 : v);
      }
    }
  }
  function on(l, x, y) { return x >= 0 && x < W && y >= 0 && y < H && l[y * W + x] === 1; }

  function rgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  // f > 0 darkens toward a deep plum (softer than black), f < 0 lightens toward white
  function shade(hex, f) {
    var c = rgb(hex), t = f > 0 ? [40, 22, 34] : [255, 255, 255], k = Math.abs(f);
    return '#' + c.map(function (v, i) { return Math.round(v + (t[i] - v) * k).toString(16).padStart(2, '0'); }).join('');
  }

  function Canvas(img) {
    this.d = img.data;
  }
  Canvas.prototype.px = function (x, y, hex) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    var c = rgb(hex), i = (y * W + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255;
  };
  // Fill a layer and give it a 1px outline in a darker shade of its own color.
  Canvas.prototype.paint = function (l, fill, outline) {
    outline = outline || shade(fill, 0.55);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      if (l[y * W + x]) this.px(x, y, fill);
      else if (on(l, x - 1, y) || on(l, x + 1, y) || on(l, x, y - 1) || on(l, x, y + 1)) this.px(x, y, outline);
    }
  };

  // ---------- item colors (placeholder until real sprites) ----------
  var COLORS = [['black', '#26232b'], ['white', '#f5f2f2'], ['pink', '#f6b3cb'], ['navy', '#2c3a78'],
    ['denim', '#5c80b8'], ['jean', '#5c80b8'], ['blue', '#6aa3e0'], ['gray', '#9a9ca3'], ['lilac', '#c5b0ea'],
    ['red', '#d9534f'], ['plaid', '#b0444a'], ['leather', '#3d2c26'], ['linen', '#ece2cc'], ['cargo', '#77774f'],
    ['trench', '#c39f68'], ['sun', '#f7cf55'], ['silk', '#e2b3d3'], ['maxi', '#8ccaa6'], ['kimono', '#ef9fb4'],
    ['sari', '#3ab5a3'], ['band', '#2f2c33'], ['puffer', '#e8674a'], ['lace', '#f7f1e8'], ['ruffle', '#f9c6d6'],
    ['corset', '#e7a1b5'], ['halter', '#f0b07a'], ['hoodie', '#a9b7c9'], ['oxford', '#cfe0f5'], ['polo', '#2c3a78']];
  function colorFor(name) {
    var n = name.toLowerCase();
    for (var i = 0; i < COLORS.length; i++) if (n.indexOf(COLORS[i][0]) !== -1) return COLORS[i][1];
    var h = 0; for (var j = 0; j < n.length; j++) h = (h * 31 + n.charCodeAt(j)) % 360;
    return hslHex(h, 55, 62);
  }
  function hslHex(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return '#' + [f(0), f(8), f(4)].map(function (v) { return Math.round(v * 255).toString(16).padStart(2, '0'); }).join('');
  }
  function has(name, words) { return words.some(function (w) { return name.toLowerCase().indexOf(w) !== -1; }); }

  // ---------- render ----------
  function render(canvas, look, outfit) {
    look = Object.assign({}, DEFAULT_LOOK, look || {});
    outfit = outfit || {};
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(W, H);
    var c = new Canvas(img);
    var skin = look.skin, hair = look.hair, style = look.style;
    var hairLine = shade(hair, 0.6), skinLine = shade(skin, 0.5);

    // back hair (behind the body)
    var back = layer();
    if (style === 'long') { rect(back, 14, 26, 36, 42); ellipse(back, 32, 68, 18, 4); }
    if (style === 'braids') rect(back, 17, 26, 30, 22);
    if (style === 'bob') { rect(back, 16, 26, 32, 20); ellipse(back, 32, 46, 16, 3); }
    if (style === 'ponytail') { ellipse(back, 47, 36, 5, 14); }
    c.paint(back, hair, hairLine);

    // body: neck, torso, arms (gap = outline between arm and torso), legs
    var body = layer();
    rect(body, 29, 44, 6, 6);
    rect(body, 23, 48, 18, 18);
    rect(body, 18, 49, 4, 15); rect(body, 42, 49, 4, 15);
    ellipse(body, 20, 65, 2.5, 2); ellipse(body, 44, 65, 2.5, 2);
    rect(body, 25, 66, 6, 19); rect(body, 33, 66, 6, 19);
    c.paint(body, skin, skinLine);

    // shoes
    var shoes = layer();
    rect(shoes, 24, 84, 8, 4); rect(shoes, 32, 84, 8, 4);
    c.paint(shoes, '#f3eef0', '#5a4650');

    var dress = outfit.dress, top = outfit.top, bottom = outfit.bottom;
    if (dress) {
      var d = layer();
      for (var dy = 48; dy <= 77; dy++) { var half = 9 + Math.floor((dy - 48) / 5); rect(d, 32 - half, dy, half * 2, 1); }
      c.paint(d, colorFor(dress));
    } else {
      // bottom (default: plain black shorts)
      var b = layer(), bc = bottom ? colorFor(bottom) : '#2a2730';
      if (!bottom || has(bottom, ['short', 'cutoff', 'skort'])) { rect(b, 24, 62, 16, 9); rect(b, 31, 69, 2, 2, 0); }
      else { rect(b, 24, 62, 16, 6); rect(b, 24, 68, 8, 16); rect(b, 32, 68, 8, 16); }
      c.paint(b, bc);

      // top (default: plain black tank)
      var t = layer(), tc = top ? colorFor(top) : '#2a2730';
      if (!top || has(top, ['tank', 'cami', 'halter', 'corset'])) {
        rect(t, 23, 50, 18, 15); rect(t, 25, 48, 3, 2); rect(t, 36, 48, 3, 2);
      } else {
        var longSleeve = has(top, ['jacket', 'coat', 'blazer', 'cardigan', 'hoodie', 'flannel', 'shirt', 'button', 'oxford']);
        rect(t, 23, 48, 18, 17);
        rect(t, 18, 49, 4, longSleeve ? 15 : 6); rect(t, 42, 49, 4, longSleeve ? 15 : 6);
      }
      c.paint(t, tc);
      if (top && has(top, ['jacket', 'coat', 'blazer', 'cardigan'])) for (var jy = 49; jy < 65; jy++) c.px(32, jy, shade(tc, 0.35));
    }

    // braids hang in front of the shoulders
    if (style === 'braids') {
      var br = layer();
      rect(br, 17, 40, 4, 6); rect(br, 43, 40, 4, 6);
      for (var by = 46; by <= 72; by += 4) { ellipse(br, 19, by, 3.5, 2.5); ellipse(br, 45, by, 3.5, 2.5); }
      c.paint(br, hair, hairLine);
      for (var ty = 47; ty <= 73; ty += 4) { c.px(18, ty, shade(hair, -0.25)); c.px(44, ty, shade(hair, -0.25)); }
    }

    // face
    var face = layer();
    ellipse(face, 32, 33.5, 14, 13);
    c.paint(face, skin, skinLine);
    var lash = '#3a2530';
    [[24, 36], [25, 37], [26, 37], [27, 37], [28, 36], [23, 35]].forEach(function (p) {
      c.px(p[0], p[1], lash); c.px(63 - p[0], p[1], lash);   // closed happy eyes, mirrored
    });
    ['#f4a9bb', '#f4a9bb', '#f7c2cf'].forEach(function (col, i) { c.px(23 + i, 40, col); c.px(40 - i, 40, col); });
    c.px(31, 42, shade(skin, 0.35)); c.px(32, 42, shade(skin, 0.35));

    // front hair: crown + side-swept bangs + face-framing locks
    var front = layer();
    ellipse(front, 32, 30, 16.5, 15);
    for (var fy = 29; fy < 48; fy++) for (var fx = 17; fx < 48; fx++) {
      var ex = (fx + 0.5 - 32) / 13, ey = (fy + 0.5 - 34) / 12.5;
      if (ex * ex + ey * ey <= 1) put(front, fx, fy, 0);
    }
    for (var bx = 20; bx <= 43; bx++) {                          // bangs: longer on the left, notched
      var len = Math.max(1, Math.round(5 - (bx - 20) * 0.17)) + (bx % 6 === 0 ? -1 : 0);
      rect(front, bx, 29, 1, len);
    }
    if (style !== 'short') { rect(front, 17, 28, 3, style === 'bob' ? 18 : 16); rect(front, 44, 28, 3, style === 'bob' ? 18 : 16); }
    else { rect(front, 18, 28, 2, 9); rect(front, 44, 28, 2, 9); }
    if (style === 'buns') { ellipse(front, 20, 17, 5.5, 5.5); ellipse(front, 44, 17, 5.5, 5.5); }
    c.paint(front, hair, hairLine);
    for (var hx = 25; hx <= 31; hx++) if (on(front, hx, 19)) c.px(hx, 19, shade(hair, -0.3)); // shine

    // accessories
    (outfit.accessories || []).forEach(function (a) {
      var ac = colorFor(a), l = layer();
      if (has(a, ['hat', 'cap'])) {
        ellipse(l, 32, 20, 17, 7); rect(l, 15, 20, 34, 3, 0);
        if (has(a, ['sun'])) rect(l, 11, 19, 42, 2); else rect(l, 30, 19, 20, 2);
        c.paint(l, ac);
      } else if (has(a, ['glasses'])) {
        [[22, 34], [35, 34]].forEach(function (p) {
          for (var i = 0; i < 7; i++) { c.px(p[0] + i, p[1], lash); c.px(p[0] + i, p[1] + 4, lash); }
          for (var k = 0; k < 5; k++) { c.px(p[0], p[1] + k, lash); c.px(p[0] + 6, p[1] + k, lash); }
        });
        c.px(29, 35, lash); c.px(30, 35, lash); c.px(31, 35, lash); c.px(32, 35, lash); c.px(33, 35, lash); c.px(34, 35, lash);
      } else if (has(a, ['scarf'])) {
        rect(l, 25, 45, 14, 5); rect(l, 34, 50, 4, 9); c.paint(l, ac);
      } else if (has(a, ['necklace'])) {
        for (var nx = 27; nx <= 36; nx++) c.px(nx, 49 + (nx === 27 || nx === 36 ? 0 : 1), ac);
        c.px(31, 51, ac); c.px(32, 51, ac);
      } else if (has(a, ['bag', 'purse', 'backpack'])) {
        for (var s = 0; s < 10; s++) c.px(41 + Math.floor(s / 2), 48 + s, shade(ac, 0.4));
        rect(l, 44, 58, 9, 7); c.paint(l, ac);
      } else if (has(a, ['watch', 'ring'])) {
        rect(l, 42, 61, 4, 2); c.paint(l, ac);
      } else if (has(a, ['bow'])) {
        rect(l, 38, 15, 4, 4); rect(l, 44, 15, 4, 4); rect(l, 42, 16, 2, 2); c.paint(l, ac);
      } else {
        rect(l, 45, 63, 5, 5); c.paint(l, ac);
      }
    });

    ctx.putImageData(img, 0, 0);
  }

  // Scale a canvas by whole numbers only so pixels stay square.
  function fit(canvas, box, padX, padY) {
    var scale = Math.max(1, Math.floor(Math.min((box.clientHeight - (padY || 0)) / H, (box.clientWidth - (padX || 0)) / W)));
    canvas.style.width = W * scale + 'px';
    canvas.style.height = H * scale + 'px';
    return scale;
  }

  root.FIPAvatar = {
    W: W, H: H, render: render, fit: fit,
    SKIN_TONES: SKIN_TONES, HAIR_COLORS: HAIR_COLORS, HAIRSTYLES: HAIRSTYLES, DEFAULT_LOOK: DEFAULT_LOOK
  };
})(typeof window !== 'undefined' ? window : globalThis);
