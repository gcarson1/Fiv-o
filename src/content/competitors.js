/* Fiv-o content: competitive landmines, keyed by option id of `dec.competition`.
   "Landmines" are questions you plant in discovery, not claims you make.
   Verify anything factual against current internal battlecards. */
(function (F) {
  'use strict';

  F.competitors = {
    vcf: {
      name: 'Renew VMware (VCF / VVF)',
      theirPitch: 'Stay put — lowest change risk, and VCF is a complete private cloud.',
      landmines: [
        'Which parts of the VCF bundle will you actually deploy in the next three years?',
        'What’s your plan when vSphere 8 general support ends in October 2027?',
        'How did this renewal change the budget for your other projects?',
        'How confident are you in the price at the next renewal?',
      ],
      counter: 'Modular: buy what you use, portable licenses, hardware and cloud choice, and a proven migration path (Move + zero-copy).',
    },
    msft: {
      name: 'Microsoft Hyper-V / Azure Local',
      theirPitch: 'You already own Windows Datacenter licensing, and Azure Local brings Azure management on-prem.',
      landmines: [
        'How many tools will your team run day to day — Windows Admin Center, SCVMM, Azure portal, Arc?',
        'Are you comfortable with Azure Local’s validated hardware list and its recurring Azure connection and billing requirements? (verify current terms)',
        'Who owns firmware, drivers, OS and storage (S2D) upgrades across the stack?',
        'How will you do DR and microsegmentation, and what does that add in cost?',
      ],
      counter: 'One console for compute, storage, network and DR; no cloud connectivity dependency; hardware choice; mature 1-click lifecycle.',
    },
    proxmox: {
      name: 'Proxmox VE',
      theirPitch: 'Free and open source, “good enough” virtualization.',
      landmines: [
        'Who do you call at 2am, and what’s the support SLA?',
        'How will you run HA storage (Ceph) and DR at scale with your team size?',
        'Do your business-app vendors certify on Proxmox?',
        'What does your auditor or cyber-insurer expect for supportability?',
      ],
      counter: 'Enterprise support (NPS 90+), integrated storage, DR and security, app certifications, and a larger partner ecosystem.',
    },
    openshift: {
      name: 'Red Hat OpenShift Virtualization',
      theirPitch: 'One platform for VMs and containers.',
      landmines: [
        'Do your VM admins have the Kubernetes skills to run VMs as Kubernetes objects?',
        'What does OpenShift cost per core compared to today?',
        'What storage will back the VMs, and who supports it?',
        'How will you migrate hundreds of VMs and keep day-2 operations familiar?',
      ],
      counter: 'AHV for VMs and NKP for containers on one platform — VM admins stay productive while the platform team gets Kubernetes.',
    },
    hpe: {
      name: 'HPE VM Essentials / Morpheus',
      theirPitch: 'Low-cost hypervisor bundled with HPE hardware and management.',
      landmines: [
        'How many production references at your scale have run it for over a year?',
        'How will storage, DR and microsegmentation be integrated?',
        'Are you comfortable being tied to one hardware vendor?',
      ],
      counter: 'A mature platform that also runs on HPE (DX / GreenLake) — hardware choice without platform risk.',
    },
    scale: {
      name: 'Scale Computing',
      theirPitch: 'Simple HCI for small sites and the edge.',
      landmines: [
        'What happens when you need to scale beyond a few nodes or sites?',
        'Do you need advanced DR, microsegmentation, file/object storage or DBaaS later?',
        'How broad is the backup and app-vendor ecosystem?',
      ],
      counter: 'Edge simplicity plus a platform that grows into DR, security, storage, databases, Kubernetes and AI.',
    },
    cloud: {
      name: 'Move to public cloud (native)',
      theirPitch: 'Get out of the datacenter business entirely.',
      landmines: [
        'What’s the refactoring cost and timeline for your long tail of VMs?',
        'What did your last unexpected cloud bill look like?',
        'How will you handle egress, latency-sensitive apps and data residency?',
      ],
      counter: 'NC2 lifts and shifts without refactoring and keeps licenses portable in both directions.',
    },
  };
})(globalThis.Fivo = globalThis.Fivo || {});
