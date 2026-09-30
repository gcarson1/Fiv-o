/* Fiv-o engine: license sketch — the lowest Nutanix packaging that covers what the customer
   needs. Needs come from technologies in scope (suggested and not declined, or marked
   interested) plus a few answers (GPUs, users, capacity). Facts live in content/licensing.js. */
(function (F) {
  'use strict';

  const RANK = { starter: 1, pro: 2, ultimate: 3 };
  const Cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  const maxTier = (tiers) => tiers.reduce((m, t) => (RANK[t] > RANK[m] ? t : m), tiers[0]);

  const SIZE = {
    'stor.size': { lt50: 'up to 50 TiB', '50to250': '50–250 TiB', '250to1p': '250 TiB–1 PiB', gt1p: '1 PiB+' },
    'euc.users': { lt250: 'up to 250 users', '250to1k': '250–1,000 users', '1kto5k': '1,000–5,000 users', gt5k: '5,000+ users' },
    'db.count': { lt25: 'under 25 databases', '25to100': '25–100 databases', '100to500': '100–500 databases', gt500: '500+ databases' },
    'env.sites': { s1: '1 site', s2: '2–5 sites', s6: '6–20 sites', s20: '20+ sites' },
  };
  const num = (v) => parseInt(String(v || '').replace(/[^0-9]/g, ''), 10) || 0;

  function recommend(s, d) {
    const L = F.licensing;
    const T = Object.fromEntries(d.tech.map((t) => [t.id, t]));
    const on = (id) => !!(T[id] && T[id].inScope);
    const sel = (qid) => (d.valid[qid] ? F.selected(F.questionById[qid], s.answers[qid]) : []);
    const has = (qid, opt) => sel(qid).includes(opt);
    const size = (qid) => SIZE[qid][sel(qid)[0]] || null;
    const why = (id, n) => (T[id] ? T[id].why.slice(0, n || 2) : []);
    const primary = d.primary && d.primary.score > 0 ? d.primary : null;

    if (!primary && !d.tech.some((t) => t.inScope)) {
      return { ready: false, note: 'The license sketch appears once a pitch starts to form.' };
    }

    // ── Quantity ──
    const counts = d.valid['env.counts'] ? (s.answers['env.counts'].value || {}) : {};
    const cores = num(counts.cores);
    const hosts = num(counts.hosts);
    const qty = cores ? `${cores} cores` : hosts ? `${hosts} hosts — confirm cores` : 'core count needed';

    // ── NCI (or NCI-C) tier ──
    const ext = on('extstorage');
    const base = ext ? 'NCI-C' : 'NCI';
    const needs = [];
    if (on('dr')) needs.push({ tier: 'pro', why: 'Async replication and DR' });
    if (on('encryption')) needs.push({ tier: 'pro', why: 'Data-at-rest encryption' });
    if (on('nc2')) needs.push({ tier: 'pro', why: 'Running on NC2 (Starter isn’t eligible)' });
    if (on('fvn')) needs.push({ tier: 'pro', why: 'Overlay networking / VPCs' });
    if (hosts > 12) needs.push({ tier: 'pro', why: 'Clusters over 12 nodes' });
    if (on('metro')) needs.push({ tier: 'ultimate', addon: 'advrep', why: 'Metro / sync replication for near-zero RPO' });
    if (on('flow')) needs.push({ tier: 'ultimate', addon: 'security', why: 'Microsegmentation (Flow Network Security)' });
    if (on('nai') && (has('ai.gpu', 'have') || has('ai.gpu', 'planning'))) needs.push({ tier: 'ultimate', why: 'GPU passthrough / vGPU for AI' });

    const ult = needs.filter((n) => n.tier === 'ultimate');
    let tier = 'pro';
    let addon = null; // one Ultimate-level need that Pro can cover with an add-on
    if (ult.length === 1 && ult[0].addon) addon = ult[0].addon;
    else if (ult.length) tier = 'ultimate';

    const nciReasons = needs.map((n) => (n.addon && n.addon === addon
      ? `${n.why} → ${L.nciAddons[addon].name}`
      : `${n.why} → ${base} ${Cap(n.tier)}`));
    if (!needs.length) nciReasons.push(`Production baseline — replication, Prism Central, dedupe and compression → ${base} Pro`);

    // ── NCM tier ──
    const ncmNeeds = [];
    if (on('ncm_ops')) ncmNeeds.push({ tier: 'starter', why: 'Capacity forecasting and right-sizing' });
    if (on('ncm_ss')) ncmNeeds.push({ tier: 'pro', why: 'Self-service catalog and blueprints' });
    if (on('ncm_cost')) ncmNeeds.push({ tier: 'pro', why: 'Cost Governance — showback and chargeback' });
    if (on('ncm_sec')) ncmNeeds.push({ tier: 'ultimate', why: 'Security Compliance reporting' });
    const ncmTier = ncmNeeds.length ? maxTier(ncmNeeds.map((n) => n.tier)) : null;
    const ncmReasons = ncmNeeds.map((n) => `${n.why} → NCM ${Cap(n.tier)}`);

    const core = [];
    const addons = [];
    const alternatives = [];
    const notes = [];
    let effTier = tier;

    if (!ncmTier) {
      core.push({ title: `${base} ${Cap(tier)}`, detail: L.nci[tier], qty, why: nciReasons });
    } else if (ncmTier === 'starter') {
      core.push({ title: `${base} ${Cap(tier)} + NCM Starter`, detail: `${L.nci[tier]}. NCM Starter: ${L.ncm.starter}.`, qty, why: [...nciReasons, ...ncmReasons] });
      const b = tier === 'ultimate' ? 'pro' : 'starter';
      if (!ext) alternatives.push({ title: `NCP ${Cap(b)}`, detail: `NCI ${Cap(L.ncp[b].nci)} + NCM Pro in one bundle — adds Self-Service and Cost Governance; compare the bundle price.` });
    } else {
      const bundle = ncmTier === 'ultimate' ? 'ultimate' : tier === 'ultimate' ? 'pro' : 'starter';
      const b = L.ncp[bundle];
      effTier = b.nci;
      if (ext) {
        core.push({ title: `NCI-C ${Cap(b.nci)} + NCM ${Cap(b.ncm)}`, detail: 'The NCP pairing on external storage — confirm bundle pricing for NCI-C with your licensing team.', qty, why: [...nciReasons, ...ncmReasons] });
      } else {
        core.push({ title: `NCP ${Cap(bundle)}`, detail: `NCI ${Cap(b.nci)} + NCM ${Cap(b.ncm)} in one bundle`, qty, why: [...nciReasons, ...ncmReasons] });
      }
      if (b.nci === 'ultimate' && tier !== 'ultimate') notes.push(`NCP ${Cap(bundle)} brings NCI Ultimate along with NCM ${Cap(b.ncm)}.`);
    }

    if (addon && effTier !== 'ultimate') {
      const a = L.nciAddons[addon];
      addons.push({ title: a.name, detail: a.detail, qty: `with ${base} Pro`, why: [ult[0].why] });
      const altTitle = !ncmTier ? `${base} Ultimate` : ncmTier === 'starter' ? `${base} Ultimate + NCM Starter` : ext ? 'NCI-C Ultimate + NCM Pro' : 'NCP Pro';
      alternatives.push({ title: altTitle, detail: `Includes ${ult[0].why.toLowerCase()} natively — simpler if they’ll want more Ultimate features later.` });
    }

    // Budget option: one small cluster with no replication needs.
    const small = (hosts && hosts <= 4) || (!hosts && has('env.itteam', 't1'));
    const oneSite = !sel('env.sites')[0] || has('env.sites', 's1');
    if (!needs.length && !ncmTier && !on('nkp') && small && oneSite) {
      alternatives.push({ title: `${base} Starter`, detail: 'Budget option for a single small cluster (up to 12 nodes) with no replication or DR.' });
    }

    // ── Add-ons and separate licenses ──
    if (on('edge')) {
      addons.push({ title: `NCI-Edge Pro${ncmTier ? ' + NCM-Edge' : ''}`, detail: L.edge, qty: size('env.sites') || 'per site', why: why('edge') });
    }
    if (on('vdi')) {
      const gpu = has('euc.gpu', 'yes') || has('euc.gpu', 'some');
      addons.push({ title: `NCI-VDI ${gpu ? 'Ultimate' : 'Pro'}`, detail: L.vdi, qty: size('euc.users') || 'per concurrent user', why: gpu ? ['GPU users need vGPU → Ultimate'] : why('vdi') });
    }
    if (on('files') || on('objects')) {
      const types = sel('stor.types');
      const capacityOnly = !on('files') && types.length > 0 && types.every((t) => ['backup', 'imaging'].includes(t));
      const ed = capacityOnly ? 'starter' : 'pro';
      const uses = [on('files') && 'Files', on('objects') && 'Objects'].filter(Boolean).join(' + ');
      addons.push({ title: `NUS ${Cap(ed)} — ${uses}`, detail: `${L.nus[ed]}; ${L.nus.metric}`, qty: size('stor.size') || 'per usable TiB', why: [...(on('files') ? why('files', 1) : []), ...(on('objects') ? why('objects', 1) : [])] });
      if (on('files') && (on('flow') || on('encryption'))) notes.push('Encrypting or segmenting file data needs the NUS Security add-on (per TiB).');
      if (on('files') && on('metro')) notes.push('Zero-RPO file shares need the NUS Advanced Replication add-on (Metro file sync).');
    }
    if (on('datalens')) {
      const pro = has('res.event', 'ransomware') || has('res.event', 'insurance') || has('stor.pain', 'ransomware');
      addons.push({ title: `Data Lens ${pro ? 'Pro' : 'Starter'}`, detail: `${L.dataLens[pro ? 'pro' : 'starter']}; ${L.dataLens.metric}`, qty: 'per TiB of file/object data', why: why('datalens') });
    }
    if (on('ndb')) {
      const big = ['100to500', 'gt500'].includes(sel('db.count')[0]);
      addons.push({ title: `NDB — ${big ? 'per cluster' : 'per VM'}`, detail: big ? L.ndb.cluster : L.ndb.vm, qty: size('db.count') || 'size with the NDB Fitment Tool', why: why('ndb') });
      alternatives.push({ title: `NDB — ${big ? 'per VM' : 'per cluster'}`, detail: big ? L.ndb.vm : L.ndb.cluster });
    }
    let nkpAddon = false;
    if (on('nkp')) {
      const where = sel('k8s.where');
      const pains = sel('k8s.pain');
      const fleet = where.length >= 2 || pains.includes('multicloud') || pains.includes('sprawl');
      const prod = ['some', 'broad'].includes(sel('k8s.stage')[0]) || where.some((w) => ['cloud', 'edge', 'airgap'].includes(w)) || sel('k8s.platform').some((x) => x !== 'none');
      if (fleet || prod) {
        nkpAddon = true;
        const ed = fleet ? 'ultimate' : 'pro';
        addons.push({ title: `NKP ${Cap(ed)}`, detail: `${L.nkp[ed]}; ${L.nkp.metric}`, qty: 'per core or vCPU', why: fleet ? ['Clusters in more than one environment → fleet management'] : ['Production Kubernetes beyond basic AHV clusters'] });
        if (primary && primary.id === 'nkp') alternatives.push({ title: 'NKP Full Stack', detail: L.nkp.fullStack });
      }
    }
    if (on('nai')) {
      addons.push({ title: 'NAI Pro', detail: L.nai.pro, qty: 'per vCPU or GB of GPU memory', why: why('nai') });
      alternatives.push({ title: 'NAI Full Stack', detail: L.nai.fullStack });
    }
    if (on('agentgw')) {
      addons.push({ title: 'Nutanix Agent Gateway', detail: 'Launched in 2026 — confirm packaging with your AI specialist.', qty: '—', why: why('agentgw') });
    }
    if (on('nc2')) {
      const q = F.questionById['cloud.which'];
      const clouds = sel('cloud.which').filter((c) => c !== 'undecided').map((c) => q.options.find((o) => o.id === c).label);
      addons.push({ title: `NC2${clouds.length ? ` on ${clouds.join(' / ')}` : ''}`, detail: L.nc2, qty: 'cloud nodes sized separately', why: why('nc2') });
    }

    // ── What comes with it ──
    const included = [ext ? 'AHV, Prism and LCM (storage stays on their array)' : 'AHV, AOS storage, Prism and LCM'];
    if (on('move') || on('ahv') || (primary && primary.id === 'vmw')) included.push('Nutanix Move — free migration tool');
    if (!nkpAddon) included.push('NKP Starter — Kubernetes on AHV (comes with NCI Pro and Ultimate)');
    included.push('1 TiB of Files/Objects capacity');
    included.push('Data-at-rest encryption (NCI 7.3 and later)');
    if (effTier === 'ultimate') included.push('Metro/sync replication and microsegmentation (NCI Ultimate)');
    if (ncmTier) included.push('Nutanix Central — one view across clusters and clouds');

    const excluded = d.tech.filter((t) => t.status === 'declined')
      .map((t) => ({ title: t.tech.name, detail: 'customer not interested', reason: (t.note || '').trim() }));

    const assumptions = [
      cores ? `Sized on ${cores} cores from discovery.` : hosts ? `${hosts} hosts from discovery — confirm the core count with Nutanix Collector.` : 'No core count yet — run Nutanix Collector or get an RVTools export.',
      ...L.general,
      `Built from public packaging (${L.asOf}) — validate in Sizer and the partner quote.`,
    ];

    return { ready: true, headline: core[0].title, core, addons, included, alternatives, excluded, notes, assumptions };
  }

  // Plain-text version for the CRM notes and the copy button.
  function toText(rec) {
    if (!rec || !rec.ready) return rec ? `- ${rec.note}` : '';
    const out = [];
    const line = (prefix, l) => {
      out.push(`- ${prefix}${l.title}${l.qty ? ` — ${l.qty}` : ''}`);
      if (l.detail) out.push(`    ${l.detail}`);
      if (l.why && l.why.length) out.push(`    Why: ${l.why.join('; ')}`);
    };
    rec.core.forEach((l) => line('', l));
    rec.addons.forEach((l) => line('Add-on: ', l));
    if (rec.included.length) out.push(`- Included: ${rec.included.join('; ')}`);
    rec.alternatives.forEach((a) => out.push(`- Alternative: ${a.title} — ${a.detail}`));
    rec.excluded.forEach((x) => out.push(`- Left out: ${x.title} — ${x.detail}${x.reason ? ` (“${x.reason}”)` : ''}`));
    rec.notes.forEach((n) => out.push(`- Note: ${n}`));
    out.push(`- Assumptions: ${rec.assumptions.join(' ')}`);
    return out.join('\n');
  }

  F.licensingEngine = { recommend, toText };
})(globalThis.Fivo = globalThis.Fivo || {});
