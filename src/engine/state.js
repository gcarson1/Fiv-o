/* Fiv-o engine: session model, persistence, and answer mutations.
   No DOM access here — this file also runs under Node for tests. */
(function (F) {
  'use strict';

  const KEY = 'fivo.sessions.v1';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const today = () => new Date().toISOString().slice(0, 10);

  function newSession(setup) {
    const now = Date.now();
    return migrate({
      v: 1, id: uid(), createdAt: now, updatedAt: now,
      setup: Object.assign({}, setup || {}),
      calls: [{ n: 1, date: today(), startedAt: null }],
      answers: {},
    });
  }

  // Fill defaults so older/imported sessions always have every field.
  function migrate(s) {
    s.v = 1;
    s.setup = Object.assign({
      account: '', opp: '', se: '', partner: '', industry: '',
      segment: 'Commercial / Mid-market', attendees: [], contacts: '',
      disc: '', // buyer's DISC style: 'D' | 'I' | 'S' | 'C' | ''
    }, s.setup || {});
    if (!Array.isArray(s.setup.attendees)) s.setup.attendees = [];
    if (!Array.isArray(s.calls) || !s.calls.length) s.calls = [{ n: 1, date: today(), startedAt: null }];
    s.answers = s.answers || {};
    s.lastAnswered = s.lastAnswered || null;
    s.primaryPlay = s.primaryPlay || null;
    s.confirms = s.confirms || {};
    s.tech = s.tech || {}; // technology id → { status: 'interested' | 'declined', note }
    s.recap = s.recap || {};
    s.wrap = Object.assign({ mp: {}, nextSteps: '', notes: '', gapsExcluded: {}, rate: F.meta.hourlyRate }, s.wrap || {});
    return s;
  }

  const callNo = (s) => s.calls.length;

  // Carry last call's agreed next steps into the recap, then reopen that question.
  function startNextCall(s) {
    const q = F.questionById['dec.nextstep'];
    const a = s.answers['dec.nextstep'];
    const prev = F.answerText(q, a);
    s.recap = {
      prevNextStep: prev + (a && a.note && a.note.trim() ? ` (${a.note.trim()})` : ''),
      prevNextSteps: s.wrap.nextSteps || '',
      confirmed: {},
    };
    delete s.answers['dec.nextstep'];
    s.calls.push({ n: s.calls.length + 1, date: today(), startedAt: null });
    s.wrap.nextSteps = '';
    return s;
  }

  // ── persistence (localStorage may be missing or throw: always guarded) ──
  function readAll() {
    try {
      const raw = globalThis.localStorage && localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function writeAll(all) {
    try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch (e) { return false; }
  }
  const save = (s) => { const all = readAll(); all[s.id] = s; return writeAll(all); };
  const list = () => Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
  const get = (id) => { const s = readAll()[id]; return s ? migrate(s) : null; };
  const remove = (id) => { const all = readAll(); delete all[id]; writeAll(all); };

  const exportJSON = (s) => JSON.stringify({ fivo: 1, exportedAt: new Date().toISOString(), session: s }, null, 2);
  function importJSON(text) {
    const d = JSON.parse(text);
    const s = d && d.session ? d.session : d;
    if (!s || typeof s !== 'object' || !s.answers || !s.setup) throw new Error('Not a Fiv-o session file');
    return migrate(s);
  }

  // ── answer helpers ──
  function ans(s, qid) {
    if (!s.answers[qid]) s.answers[qid] = { value: null, done: false, note: '', quote: '', pains: {} };
    const a = s.answers[qid];
    a.pains = a.pains || {};
    return a;
  }
  function touch(s, qid, a) {
    a.call = callNo(s);
    a.ts = Date.now();
    a.skipped = false;
    s.lastAnswered = qid;
  }

  function selectOption(s, qid, optId) {
    const q = F.questionById[qid];
    const a = ans(s, qid);
    if (q.type === 'single') {
      a.value = optId;
      a.done = true;
      touch(s, qid, a);
    } else if (q.type === 'multi') {
      const v = Array.isArray(a.value) ? a.value.slice() : [];
      const i = v.indexOf(optId);
      if (i >= 0) v.splice(i, 1); else v.push(optId);
      a.value = v;
      a.call = callNo(s);
      a.ts = Date.now();
      a.skipped = false;
    }
  }

  function setField(s, qid, fieldId, val) {
    const a = ans(s, qid);
    a.value = Object.assign({}, a.value || {}, { [fieldId]: val });
    a.call = callNo(s);
  }
  function setText(s, qid, val) { const a = ans(s, qid); a.value = val; a.call = callNo(s); }

  // Done on multi/fields/text: with nothing entered it counts as a skip.
  function markDone(s, qid) {
    const q = F.questionById[qid];
    const a = ans(s, qid);
    if (!F.hasValue(q, a)) { a.skipped = true; a.done = false; s.lastAnswered = qid; return; }
    a.done = true;
    touch(s, qid, a);
  }

  function skip(s, qid) { const a = ans(s, qid); a.skipped = true; }

  // The customer's reaction to a technology you pitched. null clears it.
  function setTech(s, id, status) {
    if (!status) { delete s.tech[id]; return; }
    s.tech[id] = Object.assign({ note: '' }, s.tech[id] || {}, { status, call: callNo(s), ts: Date.now() });
  }
  function setTechNote(s, id, note) { if (s.tech[id]) s.tech[id].note = note; }
  function clear(s, qid) { delete s.answers[qid]; }
  function setNote(s, qid, v) { ans(s, qid).note = v; }
  function setQuote(s, qid, v) { ans(s, qid).quote = v; }
  // The number behind a pain: amount + unit (e.g., "16" hrs/month), impact, or `later`
  // (no number yet — it goes on the next call's agenda). `metric` is free text from older sessions.
  function setPain(s, qid, optId, key, v) {
    const a = ans(s, qid);
    a.pains[optId] = Object.assign({ impact: '', amount: '', unit: '', later: false }, a.pains[optId] || {}, { [key]: v });
  }

  // Shared predicates used by the router, scoring and UI.
  F.selected = function (q, a) {
    if (!a || a.value == null) return [];
    if (q.type === 'single') return [a.value];
    if (q.type === 'multi') return Array.isArray(a.value) ? a.value : [];
    return [];
  };
  F.hasValue = function (q, a) {
    if (!a || a.value == null) return false;
    if (q.type === 'single') return true;
    if (q.type === 'multi') return Array.isArray(a.value) && a.value.length > 0;
    if (q.type === 'fields') return Object.values(a.value).some((v) => String(v || '').trim() !== '');
    return String(a.value).trim() !== '';
  };
  F.isAnswered = function (q, a) {
    if (!a || a.skipped || !F.hasValue(q, a)) return false;
    return q.type === 'single' ? true : !!a.done;
  };
  F.answerText = function (q, a) {
    if (!a || !F.hasValue(q, a)) return '';
    if (q.type === 'fields') {
      return q.fields.filter((f) => String(a.value[f.id] || '').trim() !== '')
        .map((f) => `${String(a.value[f.id]).trim()} ${f.unit || f.label}`).join(' / ');
    }
    if (q.type === 'text') return String(a.value).trim();
    return F.selected(q, a).map((id) => (q.options.find((o) => o.id === id) || { label: id }).label).join('; ');
  };

  F.state = {
    KEY, newSession, migrate, callNo, startNextCall, today,
    save, list, get, remove, exportJSON, importJSON,
    selectOption, setField, setText, markDone, skip, clear, setNote, setQuote, setPain, setTech, setTechNote,
  };
})(globalThis.Fivo = globalThis.Fivo || {});
