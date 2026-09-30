/* Fiv-o content: technologies Fiv-o can suggest during the call.

   evidence  [term, weight] pairs; a technology is suggested once matched weights reach 1.
             Terms: "questionId:optionId" (an answer), "play:id" (that pitch is at ≥50%
             confidence), "variant:play.variant" (that version leads a pitch at ≥35%).
   core      pitches / versions that exist because of this technology. If the customer says
             they don't want it — and every other technology behind that pitch — the pitch is
             set aside, and so are the questions only it needed.
   play      pitch card to open for the full story. */
(function (F) {
  'use strict';

  F.tech = [
    {
      id: 'ahv', name: 'AHV + Prism', play: 'vmw', core: ['vmw'],
      what: 'Nutanix’s hypervisor and single management console — the replacement for vSphere and vCenter.',
      evidence: [['play:vmw', 1], ['vmw.intent:exit', 0.6], ['vmw.intent:hedge', 0.4], ['trigger:vmware', 0.3], ['env.hypervisor:vsphere', 0.2]],
    },
    {
      id: 'move', name: 'Nutanix Move', play: 'vmw', core: [],
      what: 'Free migration tool — incremental VM replication with a scheduled cutover.',
      evidence: [['vmw.intent:exit', 0.7], ['vmw.intent:hedge', 0.5], ['vmw.worry:downtime', 0.5], ['play:vmw', 0.5], ['cloud.refactor:none', 0.3]],
    },
    {
      id: 'hci', name: 'HCI storage (AOS)', play: 'refresh', core: ['vmw.hci', 'refresh'],
      what: 'Distributed storage on the servers themselves — no SAN to buy, zone or upgrade.',
      evidence: [['variant:vmw.hci', 1], ['play:refresh', 0.8], ['env.storage:vsan', 0.5], ['env.array.age:old', 0.4], ['hw.arch:3tier', 0.4], ['hw.reuse:clean', 0.4]],
    },
    {
      id: 'extstorage', name: 'AHV on their existing array (NCI-Compute)', play: 'vmw', core: ['vmw.ext'],
      what: 'Keep the array, change the hypervisor: AHV and Prism on qualified external storage.',
      evidence: [['variant:vmw.ext', 1], ['hw.reuse:array', 0.6], ['env.array.age:new', 0.5], ['vmw.worry:hardware', 0.4], ['env.array.vendor:everpure', 0.4], ['env.array.vendor:powerflex', 0.4], ['env.array.vendor:powerstore', 0.4]],
    },
    {
      id: 'ncm_ops', name: 'NCM Intelligent Operations', play: 'ops', core: ['ops'],
      what: 'Capacity forecasting, right-sizing, anomaly detection and low-code automation.',
      evidence: [['ops.capacity:surprise', 1], ['ops.capacity:manual', 0.5], ['vmw.addons:aria', 0.6], ['ops.hours:gt50', 0.5], ['ops.hours:30to50', 0.4], ['play:ops', 0.5], ['ops.upgrades:behind', 0.3], ['cost.levers:people', 0.3]],
    },
    {
      id: 'ncm_ss', name: 'NCM Self-Service', play: 'ops', core: ['ops'],
      what: 'A governed catalog and blueprints so teams get VMs in minutes instead of tickets.',
      evidence: [['ops.selfservice:weeks', 1], ['ops.selfservice:days', 0.7], ['play:ops', 0.3]],
    },
    {
      id: 'ncm_cost', name: 'NCM Cost Governance', play: 'ops', core: ['ops'],
      what: 'Metering, budgets and showback/chargeback across on-prem and public cloud.',
      evidence: [['ops.cost:both', 1], ['ops.cost:onprem', 0.8], ['ops.cost:cloud', 0.8], ['cloud.costvis:none', 0.7], ['cloud.costvis:poor', 0.6], ['cost.levers:cloud', 0.3]],
    },
    {
      id: 'ncm_sec', name: 'NCM Security Compliance', play: 'cyber', core: [],
      what: 'Security posture monitoring, remediation and regulatory compliance reporting.',
      evidence: [['res.event:audit', 0.6], ['res.event:insurance', 0.4], ['why.urgency:mandate', 0.4], ['dec.criteria:security', 0.3], ['res.network:flat', 0.2]],
    },
    {
      id: 'dr', name: 'Nutanix Disaster Recovery', play: 'dr', core: ['dr', 'dr.site'],
      what: 'Built-in replication with orchestrated recovery plans and non-disruptive test failovers.',
      evidence: [['play:dr', 0.8], ['res.dr:manual', 0.6], ['res.dr:srm', 0.6], ['res.dr:none', 0.5], ['res.dr:offsite', 0.5], ['res.event:faileddr', 0.6], ['vmw.addons:srm', 0.6], ['res.event:nosite', 0.4]],
    },
    {
      id: 'metro', name: 'Metro Availability / sync replication', play: 'dr', core: [],
      what: 'Zero-data-loss replication between nearby sites for the apps that can’t lose a transaction.',
      evidence: [['res.rpo:zero', 1]],
    },
    {
      id: 'nc2', name: 'NC2 (Nutanix Cloud Clusters)', play: 'nc2', core: ['nc2', 'vmw.nc2', 'dr.cloud'],
      what: 'The same Nutanix stack on bare-metal AWS, Azure, Google Cloud or OVHcloud — no refactoring.',
      evidence: [['variant:vmw.nc2', 1], ['variant:dr.cloud', 1], ['play:nc2', 0.8], ['cloud.direction:burst', 0.6], ['cloud.direction:dr', 0.6], ['res.site2:cloud', 0.6], ['env.cloud:vmc', 0.6], ['cloud.direction:exit', 0.5], ['cloud.direction:expand', 0.4]],
    },
    {
      id: 'flow', name: 'Flow Network Security', play: 'cyber', core: ['cyber'],
      what: 'Microsegmentation that stops ransomware moving between VMs — the NSX firewall use case.',
      evidence: [['res.network:flat', 1], ['vmw.nsx:dfw', 0.8], ['res.network:vlan', 0.5], ['res.event:ransomware', 0.4], ['play:cyber', 0.4], ['res.event:insurance', 0.3]],
    },
    {
      id: 'fvn', name: 'Flow Virtual Networking', play: 'vmw', core: [],
      what: 'Overlay networks and VPCs — the answer for NSX overlay users (validate parity first).',
      evidence: [['vmw.nsx:overlay', 1]],
    },
    {
      id: 'encryption', name: 'Data-at-rest encryption', play: 'cyber', core: ['cyber'],
      what: 'One-click software or self-encrypting-drive encryption with key management.',
      evidence: [['res.event:insurance', 0.6], ['res.event:audit', 0.6], ['why.urgency:mandate', 0.4], ['dec.criteria:security', 0.4]],
    },
    {
      id: 'datalens', name: 'Data Lens', play: 'cyber', core: ['cyber'],
      what: 'Ransomware detection, access auditing and guided recovery for file and object data.',
      evidence: [['res.files:lots', 0.7], ['stor.pain:ransomware', 0.6], ['res.event:ransomware', 0.5], ['res.files:some', 0.3], ['variant:nus.files', 0.3]],
    },
    {
      id: 'files', name: 'Nutanix Files', play: 'nus', core: ['nus', 'nus.files'],
      what: 'Scale-out SMB/NFS file services to replace Windows file servers and NAS filers.',
      evidence: [['variant:nus.files', 1], ['stor.types:fileservers', 0.8], ['stor.types:nas', 0.8], ['stor.types:profiles', 0.5], ['stor.pain:naseol', 0.5]],
    },
    {
      id: 'objects', name: 'Nutanix Objects', play: 'nus', core: ['nus', 'nus.objects'],
      what: 'S3-compatible storage with WORM object lock — an immutable backup target.',
      evidence: [['variant:nus.objects', 1], ['res.immutability:no', 0.7], ['stor.types:backup', 0.7], ['stor.pain:s3', 0.7], ['res.immutability:partial', 0.4], ['hw.what:backup', 0.4]],
    },
    {
      id: 'ndb', name: 'Nutanix Database Service (NDB)', play: 'ndb', core: ['ndb'],
      what: 'Database-as-a-service: provisioning, cloning, patching and recovery across engines.',
      evidence: [['play:ndb', 1], ['db.provision:weeks', 0.6], ['db.provision:days', 0.5], ['db.clones:manual', 0.5]],
    },
    {
      id: 'nkp', name: 'Nutanix Kubernetes Platform (NKP)', play: 'nkp', core: ['nkp'],
      what: 'Enterprise Kubernetes on AHV, bare metal or public cloud, with fleet management and GitOps.',
      evidence: [['play:nkp', 1], ['k8s.platform:tanzu', 0.6], ['vmw.addons:tanzu', 0.6], ['k8s.stage:broad', 0.5], ['k8s.stage:some', 0.4]],
    },
    {
      id: 'nai', name: 'Nutanix Enterprise AI (NAI)', play: 'ai', core: ['ai', 'ai.private'],
      what: 'Private model inferencing with approved models, OpenAI-compatible endpoints and GPU governance.',
      evidence: [['variant:ai.private', 1], ['ai.data:no', 0.7], ['ai.stage:prod', 0.4], ['ai.gpu:have', 0.4], ['ai.stage:pilots', 0.3]],
    },
    {
      id: 'agentgw', name: 'Nutanix Agent Gateway', play: 'ai', core: ['ai', 'ai.gov'],
      what: 'One governed front door for agents and models — auth, observability and token limits.',
      evidence: [['variant:ai.gov', 1], ['ai.gov:tokens', 0.6], ['ai.gov:shadow', 0.5], ['ai.gov:security', 0.5], ['ai.stage:agents', 0.5]],
    },
    {
      id: 'edge', name: 'NCI-Edge for remote sites', play: 'edge', core: ['edge'],
      what: 'Small-footprint clusters per site, managed and upgraded centrally.',
      evidence: [['play:edge', 1], ['edge.staff:none', 0.5], ['env.sites:s20', 0.5], ['env.sites:s6', 0.3]],
    },
    {
      id: 'vdi', name: 'Citrix / Horizon on AHV (NCI-VDI)', play: 'euc', core: ['euc', 'euc.citrix', 'euc.horizon'],
      what: 'Keep the VDI broker, run it on AHV with per-user licensing.',
      evidence: [['play:euc', 1], ['euc.platform:citrix', 0.6], ['euc.platform:horizon', 0.6], ['vmw.addons:horizon', 0.5], ['euc.pain:bundle', 0.4]],
    },
  ];

  F.techById = Object.fromEntries(F.tech.map((t) => [t.id, t]));
})(globalThis.Fivo = globalThis.Fivo || {});
