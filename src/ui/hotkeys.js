/* Fiv-o UI: keyboard-first controls for live calls. */
(function (F) {
  'use strict';

  const app = F.app;
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const typing = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

  document.addEventListener('keydown', (e) => {
    const ui = app.ui;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // Keys typed into a field belong to that field (check the target: a field may be
    // re-rendered away while its own handler runs).
    const inField = typing(e.target) || typing(document.activeElement);

    // Esc: leave a field, close a panel, or toggle the privacy blur.
    if (e.key === 'Escape') {
      if (inField && ui.search === null) { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return; }
      if (ui.search !== null) { ui.search = null; app.render(); return; }
      if (ui.help) { ui.help = false; app.render(); return; }
      if (ui.drawer) { ui.drawer = null; app.render(); return; }
      if (ui.screen === 'interview' || ui.blur) { ui.blur = !ui.blur; app.render(); }
      return;
    }
    if (ui.blur || inField) return;
    if (e.key === '?') { ui.help = !ui.help; app.render(); e.preventDefault(); return; }
    if (ui.screen !== 'interview' || ui.search !== null || ui.help) return;

    const k = e.key.toLowerCase();
    if (ui.drawer) {
      if (k === 'p') { ui.drawer = null; app.render(); }
      return;
    }

    const ids = F.ui.cluster();
    const qid = F.ui.activeId();
    const q = qid && F.questionById[qid];
    const hit = () => e.preventDefault();

    if (q && q.options && KEYS.includes(e.key)) {
      const o = q.options[KEYS.indexOf(e.key)];
      if (o) { hit(); F.ui.pick(q.id, o.id); }
      return;
    }
    if (e.key === 'Enter' && q) {
      hit();
      if (q.type !== 'single') app.done(q.id);
      else if (ui.pinned === q.id) { ui.pinned = null; ui.active = null; app.render(); }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!ids.length) return;
      hit();
      const i = Math.max(0, ids.indexOf(qid));
      ui.active = ids[(i + (e.key === 'ArrowDown' ? 1 : ids.length - 1)) % ids.length];
      app.render();
      return;
    }
    switch (k) {
      case '/': hit(); F.ui.openSearch(); break;
      case 's': if (q) { hit(); app.skip(q.id); } break;
      case 'b': hit(); app.undo(); break;
      case 'n': if (q) { hit(); F.ui.focusNote(q.id); } break;
      case 'q': if (q) { hit(); F.ui.openQuote(q.id); } break;
      case 'c': hit(); app.setPref('coaching', !ui.coaching); break;
      case 'p': if (app.d.primary && app.d.primary.score > 0) { hit(); F.ui.openDrawer(app.d.primary.id); } break;
      case 'w': hit(); app.go('wrap'); break;
      default: break;
    }
  });
})(globalThis.Fivo = globalThis.Fivo || {});
