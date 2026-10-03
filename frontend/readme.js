// Fit Game — howto.txt window with the game rules (the "howto" desktop icon and taskbar button).
// Any element with [data-readme] opens it (the desktop "howto" icon and the taskbar "howto" button).
// Closes with ×, OK, Escape, or a click outside the window.
(function () {
  var RULES = [
    { h: 'WELCOME TO FIT GAME', p: [
      'Dress to impress, but everything in your closet is real. Upload photos of your own clothes, ' +
      'style your pixel avatar for a surprise theme, and let your friends rate the look.'
    ] },
    { h: '1. LOBBY', p: [
      'Avatar.exe: type your name and pick a skin tone, hair color, and hairstyle (or press Shuffle).',
      'Upload.exe: add up to 10 photos of your outfits. They become your closet.',
      'Copy invite link and send it to your group chat. Up to 8 players per room.',
      'Press Ready when your avatar is done. Click a ready player\'s name to see their avatar.',
      'When everyone is ready, the host (★, first to join) presses Start game.'
    ] },
    { h: '2. OUTFIT BUILDER (1:00)', p: [
      'A random theme appears at the top, like "Y2K Pop Star" or "Cottagecore Picnic".',
      'Pick clothes from your closet tabs: Tops, Bottoms, Dresses, and Acc. Your avatar wears them live.',
      'Wear one top and one bottom, or one dress, plus as many accessories as you like.',
      'Press Lock in outfit when you\'re done. At 0:00 every outfit saves automatically.',
      'If everyone locks in early, the show starts right away.'
    ] },
    { h: '3. RUNWAY', p: [
      'Players walk the runway one at a time.',
      'You get 10 seconds to rate each look from 1 to 5 stars. You can change your vote until time runs out.',
      'You can\'t vote for your own look (unless you\'re playing solo).'
    ] },
    { h: '4. PODIUM', p: [
      'Players are ranked by total stars. Gold, silver, and bronze take the podium.',
      'Tied players share a place. Press Back to lobby to play another round.'
    ] },
    { h: 'TIPS', p: [
      'Dress for the theme, not just your favorite fit.',
      'Accessories count. A hat or a bag can sell the whole look.',
      'Upload a mix: tops, bottoms, dresses, and accessories give you more to work with.'
    ] }
  ];

  var dialog, lastFocus;

  function build() {
    var overlay = document.createElement('div');
    overlay.className = 'readme-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="px-window readme-window" role="dialog" aria-modal="true" aria-labelledby="readme-title">' +
        '<div class="px-titlebar"><span id="readme-title">howto.txt - Notepad</span>' +
          '<span class="px-titlebar__controls"><button type="button" aria-label="Minimize" disabled>_</button>' +
          '<button type="button" aria-label="Maximize" disabled>□</button>' +
          '<button type="button" aria-label="Close" data-close>×</button></span></div>' +
        '<nav class="px-menubar"><button type="button">File(F)</button><button type="button">Edit(E)</button>' +
          '<button type="button">Format(O)</button><button type="button">Help(H)</button></nav>' +
        '<div class="readme-text px-scroll px-scroll--always" tabindex="0"></div>' +
        '<div class="readme-actions"><button type="button" class="px-btn" data-close>OK</button></div>' +
      '</div>';
    var text = overlay.querySelector('.readme-text');
    RULES.forEach(function (sec) {
      var h = document.createElement('h3'); h.textContent = sec.h; text.appendChild(h);
      var ul = document.createElement('ul');
      sec.p.forEach(function (line) { var li = document.createElement('li'); li.textContent = line; ul.appendChild(li); });
      text.appendChild(ul);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('[data-close]')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) close(); });

    var css = document.createElement('style');
    css.textContent =
      '.readme-overlay { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: 16px; background: rgba(74, 35, 56, 0.35); }' +
      '.readme-window { width: min(640px, 100%); max-height: min(80vh, 720px); }' +
      '.readme-text { flex: 1; min-height: 0; margin: 4px; padding: 12px 16px; background: #fff; box-shadow: var(--bevel-sunken);' +
        ' font-family: var(--font-pixel); font-size: 16px; line-height: 1.5; letter-spacing: 0.02em; }' +
      '.readme-text h3 { margin: 12px 0 4px; font-size: 18px; letter-spacing: 0.08em; }' +
      '.readme-text h3:first-child { margin-top: 0; }' +
      '.readme-text ul { margin: 0; padding-left: 20px; }' +
      '.readme-text li { margin: 2px 0; }' +
      '.readme-actions { display: flex; justify-content: flex-end; padding: 6px 4px 2px; }';
    document.head.appendChild(css);
    document.body.appendChild(overlay);
    return overlay;
  }

  function open() {
    dialog = dialog || build();
    lastFocus = document.activeElement;
    dialog.hidden = false;
    dialog.querySelector('.readme-text').scrollTop = 0;
    dialog.querySelector('.readme-actions .px-btn').focus();
  }
  function close() {
    dialog.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-readme]')) open();
  });
  window.FITReadme = { open: open, close: function () { if (dialog) close(); } };
})();
