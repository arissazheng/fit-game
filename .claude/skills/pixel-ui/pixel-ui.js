// Pixel UI behaviors (tabs, dropzones). Include once: <script src="pixel-ui.js" defer></script>
// Tabs: <div class="px-tabs" role="tablist"> with <button class="px-tab" role="tab" aria-controls="panel-id">,
// each panel <div class="px-tabpanel" role="tabpanel" id="panel-id">. Only the selected tab's panel is shown.
(function () {
  function select(tab, focus) {
    var list = tab.closest('[role="tablist"]');
    list.querySelectorAll('[role="tab"]').forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }

  function initTabs(root) {
    (root || document).querySelectorAll('[role="tablist"]').forEach(function (list) {
      var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
      if (!tabs.length) return;
      select(tabs.find(function (t) { return t.getAttribute('aria-selected') === 'true'; }) || tabs[0]);
      list.addEventListener('click', function (e) {
        var tab = e.target.closest('[role="tab"]');
        if (tab && list.contains(tab)) select(tab);
      });
      list.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        var next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        select(tabs[(next + tabs.length) % tabs.length], true);
      });
    });
  }

  // Dropzones: <div class="px-well px-dropzone"><input type="file" accept="image/*" multiple> ...</div>
  // Clicking anywhere in the box (or Enter/Space when focused) opens the file picker; dropping files also works.
  // The first image is previewed in the box (add data-preview="none" to skip that and render your own). Listen for the "px-files" event to receive the File list:
  //   zone.addEventListener('px-files', function (e) { e.detail.files; });
  function initDropzones(root) {
    (root || document).querySelectorAll('.px-dropzone').forEach(function (zone) {
      if (zone.dataset.pxReady) return;
      zone.dataset.pxReady = '1';
      var input = zone.querySelector('input[type="file"]');
      if (!input) return;
      if (!zone.hasAttribute('tabindex')) zone.tabIndex = 0;
      if (!zone.hasAttribute('role')) zone.setAttribute('role', 'button');
      var preview = null, url = null;

      function handle(fileList) {
        var files = Array.prototype.filter.call(fileList || [], function (f) { return /^image\//.test(f.type); });
        if (!files.length) return;
        if (zone.dataset.preview === 'none') {
          zone.dispatchEvent(new CustomEvent('px-files', { bubbles: true, detail: { files: files } }));
          return;
        }
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(files[0]);
        if (!preview) {
          preview = document.createElement('img');
          preview.className = 'px-dropzone__preview';
          preview.alt = 'Uploaded photo preview';
          zone.appendChild(preview);
        }
        preview.src = url;
        var empty = zone.querySelector('.px-well__empty');
        if (empty) empty.hidden = true;
        zone.dispatchEvent(new CustomEvent('px-files', { bubbles: true, detail: { files: files } }));
      }

      zone.addEventListener('click', function (e) {
        if (e.target !== input) input.click();
      });
      zone.addEventListener('keydown', function (e) {
        if (e.target === zone && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); input.click(); }
      });
      input.addEventListener('change', function () { handle(input.files); input.value = ''; });
      zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('is-dragover'); });
      zone.addEventListener('dragleave', function (e) {
        if (!zone.contains(e.relatedTarget)) zone.classList.remove('is-dragover');
      });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        zone.classList.remove('is-dragover');
        handle(e.dataTransfer && e.dataTransfer.files);
      });
    });
  }

  function init(root) { initTabs(root); initDropzones(root); }
  window.PixelUI = { init: init, initTabs: initTabs, selectTab: select, initDropzones: initDropzones };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
})();
