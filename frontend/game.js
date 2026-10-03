// Fit Game — shared game state for the prototype pages (lobby, outfit builder, runway).
// Stores the player's avatar look and uploaded photos in this browser's localStorage so they carry
// from the lobby into the outfit builder. Photos are also synced to the backend (POST
// /api/uploads, see fit-game/API.md) so they survive beyond this browser; look/outfit stay
// localStorage-only until real auth + inventory (fit-game server steps 7-8) land.
(function (root) {
  var FIP = root.FIP = root.FIP || {};
  var KEYS = { avatar: 'fip.avatar', photos: 'fip.photos' };
  var MAX_PHOTOS = 10;
  // Same-origin by default — the backend serves this frontend directly (see
  // /server). Only needed if FIP_API_BASE is set to point somewhere else.
  var API_BASE = typeof root.FIP_API_BASE === 'string' ? root.FIP_API_BASE : '';

  // Best-effort: persist the original files server-side (POST /api/uploads), then for each one:
  //   - pixelize it at the avatar's own canvas size (frontend/avatar.js's 64x96 CANVAS, via the
  //     same shared pixelize() module the backend uses everywhere else) so the closet thumbnail
  //     becomes a real pixel-art version of the photo. onPixelized(name, url) fires per photo.
  //   - extract the real garments in it (OpenAI vision; avatar.js draws any item by name already,
  //     so no sprite image is needed — see API.md's Extraction section) and save them as closet
  //     items. FIP.loadCloset (below) reads these back on the outfit-builder page.
  // Failures here don't block the UI — the shrunk localStorage copy (below) already carries a
  // preview across pages regardless.
  function syncAndPixelize(files, onPixelized) {
    var formData = new FormData();
    files.forEach(function (f) { formData.append('photos', f); });
    fetch(API_BASE + '/api/uploads', { method: 'POST', body: formData })
      .then(function (res) { return res.json().then(function (data) {
        if (!res.ok) throw new Error(data && data.error || 'Upload failed');
        return data.uploads;
      }); })
      .then(function (uploads) {
        uploads.forEach(function (u, i) {
          var name = files[i] ? files[i].name : u.originalName;
          fetch(API_BASE + '/api/photos/' + u.id + '/pixelize', { method: 'POST' })
            .then(function (res) { return res.json().then(function (data) {
              if (!res.ok) throw new Error(data && data.error || 'Pixelize failed');
              return data.url;
            }); })
            .then(function (url) { onPixelized(name, API_BASE + url); })
            .catch(function (err) { console.warn('Could not pixelize ' + name + ':', err); });

          fetch(API_BASE + '/api/photos/' + u.id + '/extract', { method: 'POST' })
            .then(function (res) { return res.json().then(function (data) {
              if (!res.ok) throw new Error(data && data.error || 'Extraction failed');
              return data.items;
            }); })
            .then(function (items) { console.log('Found ' + items.length + ' item(s) in ' + name, items); })
            .catch(function (err) { console.warn('Could not find clothes in ' + name + ':', err); });
        });
      })
      .catch(function (err) { console.warn('Could not sync photos to the server:', err); });
  }

  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  FIP.store = {
    // Each tab is its own player: the tab's look lives in sessionStorage, and localStorage remembers
    // the last look as the starting point for the next visit.
    getAvatar: function () {
      var d = root.FIPAvatar ? root.FIPAvatar.DEFAULT_LOOK : {};
      var tab = null;
      try { tab = JSON.parse(sessionStorage.getItem(KEYS.avatar)); } catch (e) {}
      return Object.assign({ name: '' }, d, tab || read(KEYS.avatar, {}));
    },
    setAvatar: function (look) {
      try { sessionStorage.setItem(KEYS.avatar, JSON.stringify(look)); } catch (e) {}
      return write(KEYS.avatar, look);
    },
    getPhotos: function () { return read(KEYS.photos, []); },
    setPhotos: function (list) { return write(KEYS.photos, list); }
  };

  // Shrink a photo so 10 of them fit in localStorage (about 30-60 KB each).
  function shrink(file, maxSide) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, maxSide / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve({ name: file.name, dataUrl: c.toDataURL('image/jpeg', 0.8) });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not read ' + file.name)); };
      img.src = url;
    });
  }

  // Wire an Upload.exe box: a .px-dropzone (data-preview="none"), a thumbnail grid, a "0 / 10" counter,
  // and an optional status bar cell. Photos persist across pages.
  FIP.mountUpload = function (opts) {
    var zone = opts.zone, thumbs = opts.thumbs, count = opts.count, status = opts.status;
    var photos = FIP.store.getPhotos();
    var pixelizedByName = {}; // name -> backend pixel-art URL, filled in as each one finishes

    function say(msg) { if (status) status.textContent = msg; }
    function draw() {
      thumbs.innerHTML = '';
      photos.forEach(function (p, i) {
        var slot = document.createElement('div');
        slot.className = 'px-slot thumb';
        slot.title = p.name;
        var img = document.createElement('img');
        img.src = pixelizedByName[p.name] || p.dataUrl; img.alt = p.name;
        var del = document.createElement('button');
        del.className = 'thumb__remove'; del.type = 'button'; del.textContent = '×';
        del.setAttribute('aria-label', 'Remove ' + p.name);
        del.addEventListener('click', function () {
          photos.splice(i, 1); FIP.store.setPhotos(photos); draw(); say('Removed ' + p.name);
        });
        slot.append(img, del);
        thumbs.appendChild(slot);
      });
      count.textContent = photos.length + ' / ' + MAX_PHOTOS;
    }

    zone.addEventListener('px-files', function (e) {
      var room = MAX_PHOTOS - photos.length;
      var files = e.detail.files.slice(0, Math.max(0, room));
      var skipped = e.detail.files.length - files.length;
      if (!files.length) { say('Closet is full (max ' + MAX_PHOTOS + ' photos). Remove one to add more.'); return; }
      say('Importing ' + files.length + (files.length === 1 ? ' photo...' : ' photos...'));
      syncAndPixelize(files, function (name, url) { pixelizedByName[name] = url; draw(); });
      Promise.all(files.map(function (f) { return shrink(f, 360); })).then(function (added) {
        photos = photos.concat(added);
        var saved = FIP.store.setPhotos(photos);
        draw();
        var msg = added.length + (added.length === 1 ? ' photo' : ' photos') + ' added to your closet';
        if (skipped) msg += ' · ' + skipped + ' skipped (max ' + MAX_PHOTOS + ')';
        if (!saved) msg += " · couldn't save them in this browser, so they won't carry to the next page";
        say(msg);
      }).catch(function (err) { say(err.message); });
    });

    draw();
  };

  // Starter items so the closet is never empty before any photo is uploaded/extracted.
  var DEFAULT_ITEMS = [
    { slot: 'top', name: 'Pink shirt', source: 'default' },
    { slot: 'bottom', name: 'Purple shorts', source: 'default' }
  ];

  // Icon for a closet button: render the player's own avatar wearing just this one item
  // (frontend/avatar.js — same renderer, same colors/shapes the game uses everywhere else),
  // not an emoji guess. look defaults to the player's current lobby look.
  function renderItemIcon(it, look) {
    var canvas = document.createElement('canvas');
    canvas.className = 'px-img';
    canvas.style.width = '26px';
    canvas.style.height = '39px'; // matches FIPAvatar's 64x96 (2:3) aspect
    var outfit = it.slot === 'accessory' ? { accessories: [it.name] } : {};
    if (it.slot !== 'accessory') outfit[it.slot] = it.name;
    root.FIPAvatar.render(canvas, look, outfit);
    return canvas;
  }

  // Populate the closet tabs (Tops/Bottoms/Dresses/Acc) with the player's own detected items
  // (plus a couple of starter defaults) instead of placeholder ones. panels = { top: el,
  // bottom: el, dress: el, accessory: el } (each the .slots container inside that category's
  // tabpanel). Clicking still works exactly as before — the outfit builder reads selection
  // from the .px-slot's title attribute.
  FIP.loadCloset = function (panels, opts) {
    var status = opts && opts.status;
    var look = (opts && opts.look) || FIP.store.getAvatar();
    fetch(API_BASE + '/api/inventory')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var items = DEFAULT_ITEMS.concat(data.items || []);
        Object.keys(panels).forEach(function (slot) {
          var mine = items.filter(function (it) { return it.slot === slot; });
          if (!mine.length) return;
          panels[slot].innerHTML = '';
          mine.forEach(function (it) {
            var btn = document.createElement('button');
            btn.className = 'px-slot'; btn.title = it.name; btn.setAttribute('aria-label', it.name);
            btn.appendChild(renderItemIcon(it, look));
            panels[slot].appendChild(btn);
          });
        });
        var found = items.length - DEFAULT_ITEMS.length;
        if (status && found > 0) status.textContent = found + ' item' + (found === 1 ? '' : 's') + ' from your closet';
      })
      .catch(function (err) { console.warn('Could not load your closet:', err); });
  };
})(typeof window !== 'undefined' ? window : globalThis);
