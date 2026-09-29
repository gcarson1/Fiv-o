/* Fiv-o UI: boot, theme, and the call timer. */
(function (F) {
  'use strict';

  const app = F.app;
  const theme = F.dom.prefs.get('theme', null);
  if (theme) document.documentElement.dataset.theme = theme;

  F.ui.toggleTheme = function () {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    F.dom.prefs.set('theme', next);
  };

  // Timer: only touches the one element, so it never disturbs typing.
  setInterval(() => {
    const el = document.getElementById('timer');
    if (!el || !app.s) return;
    const call = app.s.calls[app.s.calls.length - 1];
    el.textContent = call.startedAt ? F.dom.fmtTime(Date.now() - call.startedAt) : '0:00';
  }, 1000);

  // Flush autosave before the tab closes.
  window.addEventListener('beforeunload', () => { if (app.s) F.state.save(app.s); });

  app.render();
})(globalThis.Fivo = globalThis.Fivo || {});
