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
    // `serves`: the pitches a topic exists for — if the customer declines all of them,
    // the topic's remaining questions are set aside.
    modules: [
      { id: 'why', label: 'Why now', desc: 'The trigger and the date driving it' },
      { id: 'env', label: 'Environment', desc: 'Team, hypervisor, storage, backup, cloud' },
      { id: 'vmware', label: 'VMware', desc: 'Renewal, licensing, NSX, migration worries', serves: ['vmw'], when: { any: ['trigger:vmware', 'env.hypervisor:vsphere'] } },
      { id: 'hardware', label: 'Hardware', desc: 'Servers or storage reaching end of life', serves: ['refresh'], when: { any: ['trigger:hardware', 'env.array.age:old'] } },
      { id: 'ops', label: 'Operations', desc: 'Upgrades, tool sprawl, day-to-day toil', serves: ['ops'], when: { any: ['trigger:ops', 'env.itteam:t1', 'env.itteam:t2'] } },
      { id: 'resilience', label: 'DR & cyber', desc: 'Backup, disaster recovery, ransomware, audits', serves: ['dr', 'cyber'], when: { any: ['trigger:resilience', 'env.backup:none', 'vmw.addons:srm', 'cloud.direction:dr'] } },
      { id: 'cloud', label: 'Cloud', desc: 'Datacenter exit, cloud costs, hybrid plans', serves: ['nc2'], when: { any: ['trigger:cloud', 'env.cloud:vmc', 'vmw.license:cloud'] } },
      { id: 'storage', label: 'Storage', desc: 'File servers, NAS, backup targets', serves: ['nus'], when: { any: ['trigger:storage', 'res.files:lots', 'hw.what:backup', 'res.immutability:no'] } },
      { id: 'edge', label: 'Remote sites', desc: 'Branches and sites without IT staff', serves: ['edge'], when: { any: ['trigger:edge', 'env.sites:s6', 'env.sites:s20'] } },
      { id: 'euc', label: 'VDI', desc: 'Citrix or Horizon desktops', serves: ['euc'], when: { any: ['trigger:euc', 'vmw.addons:horizon', 'stor.types:profiles'] } },
      { id: 'db', label: 'Databases', desc: 'Provisioning, cloning, patching, DBA workload', serves: ['ndb'], when: { any: ['trigger:db'] } },
      { id: 'k8s', label: 'Kubernetes', desc: 'Containers and platform engineering', serves: ['nkp'], when: { any: ['trigger:k8s', 'vmw.addons:tanzu', 'cloud.refactor:native'] } },
      { id: 'ai', label: 'AI', desc: 'GenAI pilots, GPUs, data sensitivity, governance', serves: ['ai'], when: { any: ['trigger:ai', 'stor.types:ai', 'edge.apps:ai'] } },
      { id: 'cost', label: 'Cost', desc: 'Savings targets and consolidation', when: { any: ['trigger:cost'] } },
      { id: 'decision', label: 'Decision', desc: 'Buyer, criteria, process, competition, next step' },
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
