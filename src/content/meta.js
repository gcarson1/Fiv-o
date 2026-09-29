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

    // Topic modules, in default order. `when` gates every question in the module
    // (ANDed with the question's own `when`). Terms are "questionId:optionId".
    modules: [
      { id: 'why', label: 'Why now', icon: '◎' },
      { id: 'env', label: 'Environment', icon: '▦' },
      { id: 'vmware', label: 'VMware / Broadcom', icon: '⇄', when: { any: ['trigger:vmware', 'env.hypervisor:vsphere'] } },
      { id: 'hardware', label: 'Hardware refresh', icon: '▤', when: { any: ['trigger:hardware', 'env.array.age:old'] } },
      { id: 'ops', label: 'Operations & team', icon: '⚙', when: { any: ['trigger:ops', 'env.itteam:t1', 'env.itteam:t2'] } },
      { id: 'resilience', label: 'DR & cyber', icon: '⛨', when: { any: ['trigger:resilience', 'env.backup:none', 'vmw.addons:srm', 'cloud.direction:dr'] } },
      { id: 'cloud', label: 'Cloud direction', icon: '☁', when: { any: ['trigger:cloud', 'env.cloud:vmc', 'vmw.license:cloud'] } },
      { id: 'storage', label: 'Files & storage', icon: '▣', when: { any: ['trigger:storage', 'res.files:lots', 'hw.what:backup', 'res.immutability:no'] } },
      { id: 'edge', label: 'Remote sites / edge', icon: '⌖', when: { any: ['trigger:edge', 'env.sites:s6', 'env.sites:s20'] } },
      { id: 'euc', label: 'VDI / EUC', icon: '▭', when: { any: ['trigger:euc', 'vmw.addons:horizon', 'stor.types:profiles'] } },
      { id: 'db', label: 'Databases', icon: '⛁', when: { any: ['trigger:db'] } },
      { id: 'k8s', label: 'Kubernetes', icon: '⎈', when: { any: ['trigger:k8s', 'vmw.addons:tanzu', 'cloud.refactor:native'] } },
      { id: 'ai', label: 'AI initiatives', icon: '✦', when: { any: ['trigger:ai', 'stor.types:ai', 'edge.apps:ai'] } },
      { id: 'cost', label: 'Cost & consolidation', icon: '$', when: { any: ['trigger:cost'] } },
      { id: 'decision', label: 'Decision (MEDDPICC)', icon: '✓' },
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
