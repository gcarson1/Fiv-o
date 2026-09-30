/* Fiv-o content: personas, industries, modules, MEDDPICC letters.
   Edit freely — the engine reads everything by id. */
(function (F) {
  'use strict';

  F.meta = {
    personas: [
      { id: 'exec', label: 'CIO / IT Director' },
      { id: 'infra', label: 'Infrastructure / Virtualization admin' },
      { id: 'storage', label: 'Storage / Backup admin' },
      { id: 'netsec', label: 'Network / Security' },
      { id: 'dba', label: 'DBA / App owner' },
      { id: 'platform', label: 'DevOps / Platform eng' },
      { id: 'ai', label: 'AI / Data lead' },
      { id: 'euc', label: 'EUC / Desktop admin' },
      { id: 'finance', label: 'Finance / Procurement' },
    ],

    industries: [
      'Healthcare', 'Financial services / Credit union', 'State & local government',
      'Education', 'Manufacturing', 'Retail', 'Professional services / Legal',
      'Energy & utilities', 'Transportation & logistics', 'Technology / SaaS',
      'Media & entertainment', 'Other',
    ],

    segments: ['Commercial / Mid-market', 'Enterprise', 'Public sector'],

    // The call runs in five phases, in this order, so it follows the customer's story
    // instead of jumping between topics. Every question belongs to one phase.
    //   byTopic  within the phase, the customer's top-ranked topic goes first
    //            (otherwise questions follow the order they're written in questions.js)
    //   bridge   something to say out loud when the phase starts
    phases: [
      { id: 1, label: 'Why now', desc: 'The event that forced this, the deadline, and what happens if they miss it.', byTopic: true,
        bridge: 'What made this a priority right now?' },
      { id: 2, label: 'Environment', desc: 'What they run today, in one pass: platform, storage, servers, sites, team.',
        bridge: 'Before we get into what’s not working, help me picture what you run today.' },
      { id: 3, label: 'Pain & cost', desc: 'What hurts. For every pain they name, get the number before moving on.', byTopic: true,
        bridge: 'Now that I have the picture, where does it hurt the most?' },
      { id: 4, label: 'Change & risk', desc: 'Intent to move or stay, how attached they are, and what worries them about switching.',
        bridge: 'If you did make a change, how would the team feel about it?' },
      { id: 5, label: 'Decision', desc: 'Who signs, budget and approvals, the process, how they buy, and who else they’re looking at.',
        bridge: 'Let’s talk about how a decision like this gets made.' },
    ],

    // Units for the number behind a pain. `yearly` multiplies to a per-year figure;
    // hours are valued at the loaded hourly rate (set on the wrap-up screen).
    // `eg` is the placeholder in the number field.
    units: [
      { id: 'hpw', label: 'hours / week', kind: 'hours', yearly: 52, eg: 'e.g. 10' },
      { id: 'hpm', label: 'hours / month', kind: 'hours', yearly: 12, eg: 'e.g. 16' },
      { id: 'pct', label: '% of team time', kind: 'pct', eg: 'e.g. 30' },
      { id: 'dpy', label: '$ / year', kind: 'usd', yearly: 1, eg: 'e.g. 40k' },
      { id: 'dpm', label: '$ / month', kind: 'usd', yearly: 12, eg: 'e.g. 5k' },
      { id: 'usd', label: '$ one-time', kind: 'once', eg: 'e.g. 250k' },
      { id: 'dpd', label: '$ per day down', kind: 'perDay', eg: 'e.g. 50k' },
      { id: 'days', label: 'days', kind: 'count', eg: 'e.g. 3' },
      { id: 'people', label: 'people affected', kind: 'count', eg: 'e.g. 200' },
      { id: 'other', label: 'other', kind: 'text', eg: 'Describe it' },
    ],
    hourlyRate: 75, // default loaded cost of an IT hour, in dollars

    // Topics. `generic` topics hold the questions every call asks; the rest open from
    // "why now" or from answers. `when` gates every question in the topic (ANDed with
    // the question's own `when`); terms are "questionId:optionId".
    // `serves`: the pitches a topic exists for — if the customer declines all of them,
    // the topic's remaining questions are set aside.
    modules: [
      { id: 'why', label: 'Why now', desc: 'The trigger, the deadline, and the consequence', generic: true },
      { id: 'env', label: 'Environment', desc: 'Platform, storage, servers, sites, team, backup, cloud', generic: true },
      { id: 'vmware', label: 'VMware', desc: 'Renewal, version, licensing, NSX, intent', serves: ['vmw'], when: { any: ['trigger:vmware', 'env.hypervisor:vsphere'] } },
      { id: 'hardware', label: 'Hardware', desc: 'Servers or storage reaching end of life', serves: ['refresh'], when: { any: ['trigger:hardware', 'env.array.age:old', 'env.servers:old', 'env.servers:out'] } },
      { id: 'ops', label: 'Operations', desc: 'Upgrades, tool sprawl, day-to-day toil', serves: ['ops'], when: { any: ['trigger:ops', 'env.itteam:t1', 'env.itteam:t2', 'env.itteam:t3'] } },
      { id: 'resilience', label: 'DR & cyber', desc: 'Backup, disaster recovery, ransomware, audits', serves: ['dr', 'cyber'], when: { any: ['trigger:resilience', 'env.backup:none', 'vmw.addons:srm', 'cloud.direction:dr'] } },
      { id: 'cloud', label: 'Cloud', desc: 'Datacenter exit, cloud costs, hybrid plans', serves: ['nc2'], when: { any: ['trigger:cloud', 'env.cloud:vmc', 'vmw.license:cloud'] } },
      { id: 'storage', label: 'Storage', desc: 'File servers, NAS, backup targets', serves: ['nus'], when: { any: ['trigger:storage', 'res.files:lots', 'hw.what:backup', 'res.immutability:no'] } },
      { id: 'edge', label: 'Remote sites', desc: 'Branches and sites without IT staff', serves: ['edge'], when: { any: ['trigger:edge', 'env.sites:s6', 'env.sites:s20'] } },
      { id: 'euc', label: 'VDI', desc: 'Citrix or Horizon desktops', serves: ['euc'], when: { any: ['trigger:euc', 'vmw.addons:horizon', 'stor.types:profiles'] } },
      { id: 'db', label: 'Databases', desc: 'Provisioning, cloning, patching, DBA workload', serves: ['ndb'], when: { any: ['trigger:db'] } },
      { id: 'k8s', label: 'Kubernetes', desc: 'Containers and platform engineering', serves: ['nkp'], when: { any: ['trigger:k8s', 'vmw.addons:tanzu', 'cloud.refactor:native'] } },
      { id: 'ai', label: 'AI', desc: 'GenAI pilots, GPUs, data sensitivity, governance', serves: ['ai'], when: { any: ['trigger:ai', 'stor.types:ai', 'edge.apps:ai'] } },
      { id: 'cost', label: 'Cost', desc: 'Savings targets and consolidation', when: { any: ['trigger:cost'] } },
      { id: 'change', label: 'Change & risk', desc: 'Openness to change and migration fears', generic: true },
      { id: 'decision', label: 'Decision', desc: 'Buyer, budget, process, competition, next step', generic: true },
    ],

    // Which module each "why now" trigger opens (ranked order drives topic order).
    triggerModule: {
      vmware: 'vmware', hardware: 'hardware', ops: 'ops', resilience: 'resilience',
      cloud: 'cloud', storage: 'storage', edge: 'edge', euc: 'euc', db: 'db',
      k8s: 'k8s', ai: 'ai', cost: 'cost',
    },

    meddpicc: [
      { k: 'M', label: 'Metrics' },
      { k: 'E', label: 'Economic Buyer' },
      { k: 'DC', label: 'Decision Criteria' },
      { k: 'DP', label: 'Decision Process' },
      { k: 'PP', label: 'Paper Process' },
      { k: 'I', label: 'Identified Pain' },
      { k: 'CH', label: 'Champion' },
      { k: 'CO', label: 'Competition' },
    ],
  };
})(globalThis.Fivo = globalThis.Fivo || {});
