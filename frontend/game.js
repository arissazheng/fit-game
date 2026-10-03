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

  // Best-effort: persist the original files server-side (POST /api/uploads),
  // then pixelize each one at the avatar's own canvas size (frontend/avatar.js's
  // 64x96 CANVAS, via the same shared pixelize() module the backend uses
  // everywhere else) so the closet thumbnail becomes a real pixel-art version
  // of the photo once it's ready. onPixelized(name, url) fires per photo;
  // failures here don't block the UI — the shrunk localStorage copy (below)
  // already carries a preview across pages regardless.
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
})(typeof window !== 'undefined' ? window : globalThis);
