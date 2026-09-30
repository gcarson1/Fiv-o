/* Fiv-o content: Nutanix packaging facts the license sketch is built from.
   Public sources as of Sept 2026 — packaging changes, so validate against the current
   licensing guide / Sizer before quoting. The engine (src/engine/licensing.js) decides
   which of these apply to a customer. */
(function (F) {
  'use strict';

  F.licensing = {
    asOf: 'Sept 2026',
    src: {
      options: 'https://www.nutanix.com/products/cloud-platform/software-options',
      nci: 'https://www.nutanix.com/library/datasheets/nci',
      ncic: 'https://www.nutanix.com/library/datasheets/nci-c',
      ncm: 'https://www.nutanix.com/library/datasheets/ncm',
      nkp: 'https://www.nutanix.com/products/kubernetes-management-platform',
      nc2: 'https://www.nutanix.com/products/nutanix-cloud-clusters/pricing',
      powerstore: 'https://virtualizationreview.com/articles/2026/07/28/nutanix-nci-7-6-adds-dell-powerstore-support.aspx',
    },

    // Nutanix Cloud Infrastructure — per physical core, 1–5 year terms.
    nci: {
      starter: 'AHV, AOS storage and Prism; clusters up to 12 nodes; no replication or DR; not eligible for NC2',
      pro: 'Async replication and DR, data-at-rest encryption (NCI 7.3+), dedupe and compression, Prism Central, overlay networking; NKP Starter included',
      ultimate: 'Everything in Pro plus Metro, sync and NearSync replication, microsegmentation, erasure coding, vGPU and cross-cluster live migration',
    },
    nciAddons: {
      advrep: { name: 'Advanced Replication add-on', detail: 'Metro, sync and NearSync on NCI Pro' },
      security: { name: 'Security add-on', detail: 'Microsegmentation (Flow Network Security) on NCI Pro' },
    },
    // AHV on qualified external storage uses NCI-Compute in the same three tiers.
    ncic: 'Same Starter / Pro / Ultimate tiers for AHV on qualified external storage — Everpure FlashArray, Dell PowerFlex, Dell PowerStore (NCI 7.6+); NetApp ONTAP and Lenovo ThinkSystem announced',

    // Nutanix Cloud Manager — per physical core.
    ncm: {
      starter: 'Intelligent Operations: capacity forecasting, right-sizing, reporting, low-code automation',
      pro: 'Adds Self-Service (catalog, VM blueprints, runbooks) and Cost Governance (metering, budgets, chargeback)',
      ultimate: 'Adds app blueprints, approvals and scheduling, and Security Compliance',
    },

    // Nutanix Cloud Platform "better together" bundles (NCI + NCM).
    ncp: {
      starter: { nci: 'pro', ncm: 'pro' },
      pro: { nci: 'ultimate', ncm: 'pro' },
      ultimate: { nci: 'ultimate', ncm: 'ultimate' },
    },

    nus: {
      starter: 'Capacity-optimized Objects (and large archive Files) for backup, archive and video targets',
      pro: 'Files, Objects and Volumes for general-purpose and performance use; WORM / object lock, tiering, Metro file sync add-on',
      metric: 'per usable TiB; 1 TiB of Files/Objects is included with every NCI edition',
    },
    dataLens: {
      starter: 'Reporting, anomaly and basic ransomware detection',
      pro: 'Behavior-based ransomware detection, automated recovery for Files, permissions risk reporting',
      metric: 'per usable TiB; SaaS or self-managed',
    },
    ndb: {
      cluster: 'Per cluster: license every physical core of a dedicated database cluster — includes NCI Ultimate functionality',
      vm: 'Per VM: license the vCPUs of the database VMs, on top of NCI',
    },
    nkp: {
      starter: 'Kubernetes on AHV — included with NCI Pro and Ultimate, not sold separately',
      pro: 'Adds any-infrastructure deployment, observability, service mesh, multitenancy and cost management',
      ultimate: 'Adds fleet management across on-prem, cloud and edge',
      metric: 'per physical core (bare metal) or vCPU (VMs); control-plane nodes unlicensed',
      fullStack: 'NKP Full Stack bundles NKP + NCI + NDK; Pro and Ultimate add 5 TiB of NUS and 10 NDB vCPUs per cluster',
    },
    nai: {
      pro: 'Per vCPU or per GB of GPU memory',
      fullStack: 'NAI Full Stack bundles NAI + NCI + NKP + NDK, with 5 TiB of NUS and 10 NDB vCPUs per cluster',
    },
    nc2: 'Bring the same term licenses (portable) or pay as you go; the bare-metal instances are billed by the cloud provider; NCI Starter isn’t eligible',
    edge: 'Per VM on a dedicated edge cluster — up to 25 powered-on VMs, 5 nodes and 96 GB per VM; includes NKP Starter and 1 TiB of Files/Objects',
    vdi: 'Per peak concurrent user on a dedicated VDI cluster; includes storage for profiles (50 GB per user on Pro, 100 GB on Ultimate)',
    general: [
      'Licenses must cover every physical core in each licensed cluster.',
      'Terms run 1–5 years with support included; licenses are portable across hardware and NC2.',
    ],
  };
})(globalThis.Fivo = globalThis.Fivo || {});
