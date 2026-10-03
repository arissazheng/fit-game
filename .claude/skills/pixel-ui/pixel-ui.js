// Pixel UI behaviors. Include once: <script src="pixel-ui.js" defer></script>
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

  window.PixelUI = { initTabs: initTabs, selectTab: select };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initTabs(); });
  else initTabs();
})();
