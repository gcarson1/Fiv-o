/* Fiv-o UI: tiny DOM helpers (no framework). */
(function (F) {
  'use strict';

  // h('div.card.active', { onclick, dataset: {...}, style: {...} }, ...children)
  function h(sel, attrs, ...kids) {
    const [tag, ...classes] = sel.split('.');
    const el = document.createElement(tag || 'div');
    if (classes.length) el.className = classes.join(' ');
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    append(el, kids);
    return el;
  }
  function append(el, kids) {
    for (const k of kids.flat(Infinity)) {
      if (k === null || k === undefined || k === false || k === '') continue;
      el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    }
  }

  let toastTimer = null;
  function toast(msg, kind) {
    let t = document.getElementById('toast');
    if (!t) { t = h('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'toast show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 2600);
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // file:// pages can lack clipboard permission — fall back to a hidden textarea.
      const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove();
    }
    toast(`${label || 'Copied'} to clipboard`, 'good');
  }

  function download(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' }));
    const a = h('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const slug = (s) => (s || 'account').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'account';
  const pct = (x) => `${Math.round(x * 100)}%`;
  const fmtTime = (ms) => {
    const t = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  };
  const ago = (ts) => {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const hr = Math.round(m / 60);
    if (hr < 24) return `${hr} h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const prefs = {
    get(k, d) { try { const p = JSON.parse(localStorage.getItem('fivo.prefs') || '{}'); return k in p ? p[k] : d; } catch (e) { return d; } },
    set(k, v) { try { const p = JSON.parse(localStorage.getItem('fivo.prefs') || '{}'); p[k] = v; localStorage.setItem('fivo.prefs', JSON.stringify(p)); } catch (e) { /* ignore */ } },
  };

  F.dom = { h, append, toast, copy, download, slug, pct, fmtTime, ago, prefs };
})(globalThis.Fivo = globalThis.Fivo || {});
