/* Fiv-o content: DISC — four ways to ask every question.
   D = Dominance (direct, results-first)      I = Influence (warm, people-first)
   S = Steadiness (calm, team-first)          C = Conscientiousness (precise, data-first)
   Keyed by question id. Every question needs all four (the content test enforces it). */
(function (F) {
  'use strict';

  F.disc = {
    styles: [
      { k: 'D', label: 'D', name: 'Dominance', cue: 'Direct, fast, results-first', adapt: 'Be brief. Lead with outcomes and the bottom line.' },
      { k: 'I', label: 'i', name: 'Influence', cue: 'Warm, talkative, people-first', adapt: 'Be friendly. Use stories and the big picture.' },
      { k: 'S', label: 'S', name: 'Steadiness', cue: 'Calm, patient, team-first', adapt: 'Be patient. Stress stability, support and low-risk steps.' },
      { k: 'C', label: 'C', name: 'Conscientiousness', cue: 'Precise, analytical, detail-first', adapt: 'Be exact. Bring data, specifics and a clear process.' },
    ],

    ask: {
      // ── Why now ──
      'trigger': {
        D: 'Bottom line — what’s forcing a decision on your infrastructure this year?',
        I: 'I’d love to hear the backstory — what got this conversation started for you and the team?',
        S: 'What’s been happening that made now feel like the right time to look at this?',
        C: 'What specific event or change triggered this evaluation, and when did it start?',
      },
      'why.urgency': {
        D: 'Is there a hard deadline? What happens if you miss it?',
        I: 'Is there a big date everyone’s working toward — a renewal, a launch, a board meeting?',
        S: 'Is there a date you’re working toward, so we can plan a comfortable timeline around it?',
        C: 'What’s the exact date driving this, and what’s contractually or operationally tied to it?',
      },
      'why.consequence': {
        D: 'And if that date passes — what happens?',
        I: 'Who feels it if this slips — and how would that land?',
        S: 'If the date came and went, what would that mean for you and the team?',
        C: 'What specifically happens after that date — support, pricing, compliance?',
      },

      // ── Environment ──
      'env.itteam': {
        D: 'How many people run infrastructure — and are they stretched?',
        I: 'Tell me about the team — who’s on it and what are they like to work with?',
        S: 'Who’s on the team that keeps everything running, and how are they holding up?',
        C: 'How many people support infrastructure, and how is responsibility split across compute, storage and network?',
      },
      'env.hypervisor': {
        D: 'What hypervisor are you running — VMware, Hyper-V, something else?',
        I: 'What’s the virtualization story — how did you end up on the platform you have today?',
        S: 'What hypervisor has the team been running, and how long have you been on it?',
        C: 'Which hypervisors and versions are in production today, and on how many clusters?',
      },
      'env.counts': {
        D: 'Roughly how many hosts, cores and VMs are we talking about?',
        I: 'Give me a feel for the size — how big has the environment grown?',
        S: 'Roughly how large is the environment today — hosts, VMs, storage?',
        C: 'Can you share exact counts — hosts, cores, VMs and TB — or an RVTools export?',
      },
      'env.sites': {
        D: 'How many locations run their own infrastructure?',
        I: 'Where do you have people and systems — one main site, or spread out?',
        S: 'How many sites does the team support, and are any hard to look after?',
        C: 'How many locations host infrastructure, and what’s deployed at each?',
      },
      'env.storage': {
        D: 'What storage is under your VMs — vSAN, a SAN, or something else?',
        I: 'What’s the storage setup behind all this, and how do people feel about it?',
        S: 'What storage are the VMs running on, and has it been dependable for you?',
        C: 'What’s the storage architecture under the hypervisor — vendor, protocol and model?',
      },
      'env.servers': {
        D: 'How old are the servers — still under warranty?',
        I: 'What’s the story with the servers — newer gear, or hosts that have been around a while?',
        S: 'How are the servers holding up, and are they still covered by warranty?',
        C: 'What are the server models, purchase dates and warranty end dates?',
      },
      'env.array.vendor': {
        D: 'Which array vendor?',
        I: 'Which array did you go with, and how’s that relationship been?',
        S: 'Which array do you have, and is the team comfortable with it?',
        C: 'Which array make and model is it, and what OS or firmware version is it running?',
      },
      'env.array.age': {
        D: 'How old is it, and when does support end?',
        I: 'How long have you had it — is it still pulling its weight?',
        S: 'How long have you had the array, and when does its support run out?',
        C: 'What’s the purchase date and the exact end-of-support date on the array?',
      },
      'env.backup': {
        D: 'What do you back up with?',
        I: 'What’s your backup setup — and are you happy with it?',
        S: 'What does the team use for backup today, and how’s it working for them?',
        C: 'Which backup product and version do you use, and where do the copies live?',
      },
      'env.cloud': {
        D: 'What are you running in public cloud today?',
        I: 'Where are you with public cloud — anything exciting happening there?',
        S: 'Do you use any public cloud today, and how has that gone for the team?',
        C: 'Which cloud providers do you use, for which workloads, and at what monthly spend?',
      },

      // ── VMware ──
      'vmw.license': {
        D: 'What VMware licensing are you on, and what’s Broadcom pushing you to?',
        I: 'How did the conversation with Broadcom go — what did they put in front of you?',
        S: 'What VMware licensing do you have now, and what’s changing for you?',
        C: 'Which VMware editions do you own, and what exactly did the new proposal include?',
      },
      'vmw.version': {
        D: 'What vSphere version are you on?',
        I: 'Where are you on versions — have you made the jump to 8 yet?',
        S: 'Which version are most hosts running, and has upgrading been a headache?',
        C: 'Which vSphere versions are in production, and on how many hosts each?',
      },
      'vmw.renewal': {
        D: 'When does your VMware term end?',
        I: 'When’s the VMware renewal coming up — is it on everyone’s radar yet?',
        S: 'When does your current VMware agreement end, so we can plan around it?',
        C: 'What’s the exact end date of your VMware term or support contract?',
      },
      'vmw.price': {
        D: 'What did the renewal do to your cost?',
        I: 'How did people react when the renewal number came in?',
        S: 'How has the renewal price affected your budget and plans?',
        C: 'What was the quoted increase — percentage and dollar amount — versus last term?',
      },
      'vmw.intent': {
        D: 'Are you leaving VMware, or looking for leverage?',
        I: 'What’s the dream outcome — off VMware completely, or somewhere in between?',
        S: 'What would feel like the right move for the team — a full switch, or a gradual step?',
        C: 'Is the goal a full exit, a partial move or a price comparison — and what will that decision be based on?',
      },
      'vmw.nsx': {
        D: 'How much NSX do you actually use?',
        I: 'Is NSX a big part of how you run things, or more in the background?',
        S: 'How much does the team rely on NSX day to day?',
        C: 'Which NSX features are in production — distributed firewall, overlay networks, edges, load balancing?',
      },
      'vmw.addons': {
        D: 'What other VMware products are in the mix — Horizon, SRM, Aria, Tanzu?',
        I: 'What else from VMware is part of the picture — desktops, DR, Kubernetes?',
        S: 'Besides vSphere, which VMware tools does the team depend on?',
        C: 'Which VMware products beyond vSphere are licensed and actually in production?',
      },
      'chg.fears': {
        D: 'What’s the biggest risk you see in switching?',
        I: 'What would people be most nervous about if you switched?',
        S: 'What worries you most about making a change like this?',
        C: 'What has to be resolved before a migration — compatibility, compliance-sensitive systems, skills?',
      },

      // ── Hardware ──
      'hw.what': {
        D: 'What hardware is coming due?',
        I: 'What’s getting old and tired in the datacenter these days?',
        S: 'What equipment is nearing the end of its life that you need to plan for?',
        C: 'Which components — servers, storage, network, backup — are up for refresh, and in what quantities?',
      },
      'hw.when': {
        D: 'When does it go out of support?',
        I: 'When does the clock run out on that gear?',
        S: 'When does support end, so we can give you a comfortable runway?',
        C: 'What are the exact end-of-support dates for each component?',
      },
      'hw.arch': {
        D: 'How is it built — servers plus SAN, or HCI?',
        I: 'Walk me through how everything fits together today.',
        S: 'How is the environment set up today, and has that setup served you well?',
        C: 'Can you describe the current architecture — compute, storage and network layers and their vendors?',
      },
      'hw.pain': {
        D: 'What’s the biggest problem with the current gear?',
        I: 'What’s the most frustrating thing about the current hardware?',
        S: 'What’s been hardest for the team with the current equipment?',
        C: 'Which issues come up most — performance, capacity, upgrades, support — and how often?',
      },
      'hw.oem': {
        D: 'Which server vendor do you buy from?',
        I: 'Who’s your go-to hardware vendor, and how’s that relationship?',
        S: 'Which hardware vendor are you most comfortable working with?',
        C: 'Do you have a preferred OEM or existing contract terms we need to work within?',
      },
      'hw.reuse': {
        D: 'Anything you need to reuse, or clean slate?',
        I: 'Is there anything you’d love to keep, or would a fresh start be exciting?',
        S: 'Is there existing hardware you’d like to keep using so the change feels smaller?',
        C: 'Which assets are still depreciating or under support and need to be reused?',
      },
      'chg.openness': {
        D: 'Is the team ready to change, or dug in?',
        I: 'How does the team feel about trying something new?',
        S: 'How would the team feel about a change — is anyone attached to how things work today?',
        C: 'Where does each person on the team stand on changing platforms, and why?',
      },

      // ── Operations ──
      'ops.consoles': {
        D: 'How many tools does it take to run everything?',
        I: 'How many different consoles does the team juggle in a day?',
        S: 'How many tools does the team have to keep track of to run things?',
        C: 'How many management tools are in use across compute, storage, network and backup?',
      },
      'ops.upgrades': {
        D: 'How painful are upgrades?',
        I: 'What’s the upgrade story — any war stories from the last one?',
        S: 'How do upgrades and patching go for the team — are they stressful?',
        C: 'How long does a full-stack upgrade take, how often do you do one, and what’s the change-window process?',
      },
      'ops.hours': {
        D: 'How much of the week goes to keeping the lights on?',
        I: 'If the team got time back, what would they love to work on instead?',
        S: 'How much of the team’s week goes to routine upkeep rather than projects?',
        C: 'Roughly what percentage of team hours goes to maintenance versus project work?',
      },
      'ops.capacity': {
        D: 'How do you know when you’ll run out of capacity?',
        I: 'Has capacity ever caught you by surprise? What happened?',
        S: 'How do you plan ahead so you don’t run short on capacity?',
        C: 'What method or tool do you use to forecast capacity, and how accurate has it been?',
      },
      'ops.selfservice': {
        D: 'How long does it take to get someone a new VM?',
        I: 'When an app team needs a VM, what does that experience feel like for them?',
        S: 'When someone needs a new VM, how smooth is that process today?',
        C: 'What’s the average time from VM request to delivery, and how many approval steps are involved?',
      },
      'ops.cost': {
        D: 'Do you need to show who’s consuming what?',
        I: 'Does leadership ask which teams use what — and how do you answer today?',
        S: 'Would it help to show each team what they’re using, on-prem or in cloud?',
        C: 'Do you need showback or chargeback, and at what level — department, app or project?',
      },

      // ── DR & cyber ──
      'res.event': {
        D: 'What’s driving the focus on resilience — an incident, an audit or insurance?',
        I: 'What’s the story behind the resilience push — did something happen?',
        S: 'What’s made recovery and security a bigger concern for you lately?',
        C: 'Which specific event, audit finding or insurance requirement prompted this?',
      },
      'res.dr': {
        D: 'What’s your DR today?',
        I: 'If the main site went dark tomorrow, what would happen?',
        S: 'How would the team recover if the main site had a problem?',
        C: 'Can you describe your DR setup — secondary site, tooling, runbooks and last test date?',
      },
      'res.site2': {
        D: 'Do you have a second site, or want one?',
        I: 'Is there somewhere you could recover to — or would cloud be more appealing?',
        S: 'Do you have a second location you could rely on, or would you rather not manage one?',
        C: 'Do you own or lease a secondary site, and what are its capacity and network links?',
      },
      'res.rpo': {
        D: 'How much data can you afford to lose, and how fast do you need to be back?',
        I: 'For your most important apps, what would “back to normal” need to look like?',
        S: 'For the apps people depend on most, how quickly do they need to be back up?',
        C: 'What are the defined RPO and RTO targets for your tier-1 applications?',
      },
      'res.network': {
        D: 'Is your network segmented, or mostly flat?',
        I: 'If someone got into one server, how far could they get?',
        S: 'How is the network separated today, and does that feel safe enough?',
        C: 'How is east-west traffic controlled — VLANs, firewall rules or microsegmentation?',
      },
      'res.files': {
        D: 'How much sensitive data is on file shares?',
        I: 'What kind of data lives on your file shares — anything that would keep you up at night?',
        S: 'How much important or sensitive data sits on shared drives?',
        C: 'How many TB of file-share data are there, and how much of it is regulated or sensitive?',
      },
      'res.immutability': {
        D: 'Are your backups immutable?',
        I: 'If ransomware hit, would your backups be safe?',
        S: 'Are your backups protected so an attacker can’t change or delete them?',
        C: 'Are backup copies immutable or air-gapped, and what retention and lock settings are in place?',
      },
      'res.recovery': {
        D: 'If ransomware hit Monday, when are you back?',
        I: 'Picture ransomware hitting on Monday — how does the week play out?',
        S: 'If something like ransomware happened, how long would it take the team to recover?',
        C: 'What’s your measured recovery time from a full ransomware event, and when was it last tested?',
      },

      // ── Cloud ──
      'cloud.direction': {
        D: 'What’s the plan for cloud?',
        I: 'What’s the big-picture cloud vision for the company?',
        S: 'Where is the company heading with cloud, and how do you feel about it?',
        C: 'What’s the documented cloud strategy — which workloads move, when and why?',
      },
      'cloud.which': {
        D: 'Which cloud?',
        I: 'Which cloud providers are you working with or excited about?',
        S: 'Which cloud provider is the team most comfortable with?',
        C: 'Which providers and regions, and do you have committed-spend agreements?',
      },
      'cloud.refactor': {
        D: 'Will you rewrite apps for cloud, or move them as-is?',
        I: 'How do the app teams feel about rebuilding for cloud?',
        S: 'Would you rather move apps as they are, or take on rebuilding them?',
        C: 'What share of apps are candidates for refactoring versus lift-and-shift, and at what cost?',
      },
      'cloud.deadline': {
        D: 'Any hard date — lease or colo contract?',
        I: 'Is there a date everyone’s watching, like a lease ending?',
        S: 'Is there a date coming up, like a lease or contract ending, that we should plan around?',
        C: 'What are the exact end dates and terms of your datacenter lease or colo contract?',
      },
      'cloud.costvis': {
        D: 'Do you know where your cloud money goes?',
        I: 'Have there been any cloud bill surprises?',
        S: 'How comfortable are you with understanding your cloud bill each month?',
        C: 'How is cloud spend tracked and allocated — tagging, reports, tools?',
      },

      // ── Storage ──
      'stor.types': {
        D: 'What unstructured data are we talking about?',
        I: 'What kinds of files and data are piling up?',
        S: 'What types of files and data does the team need to look after?',
        C: 'Which data types — file shares, NAS, backups, archives, datasets — and in what volumes?',
      },
      'stor.size': {
        D: 'How much capacity?',
        I: 'How big has the data footprint gotten?',
        S: 'About how much storage do you have to manage today?',
        C: 'What’s the total usable capacity in TB, and how much of it is consumed?',
      },
      'stor.growth': {
        D: 'How fast is it growing?',
        I: 'Is data growth speeding up — what’s driving it?',
        S: 'How quickly is the data growing, and is that getting hard to keep up with?',
        C: 'What’s the annual growth rate, and what’s the projection for the next three years?',
      },
      'stor.pain': {
        D: 'What’s the biggest storage problem?',
        I: 'What’s the most frustrating thing about storage right now?',
        S: 'What’s been the hardest part of managing storage for the team?',
        C: 'Which storage issues cost you the most — price per TB, silos, performance or risk?',
      },

      // ── Remote sites ──
      'edge.staff': {
        D: 'Any IT staff at the sites?',
        I: 'Who handles IT at the sites — a real IT person, or whoever’s around?',
        S: 'Is there anyone at the sites to help when something goes wrong?',
        C: 'Which sites have IT staff on site, and how many have none?',
      },
      'edge.apps': {
        D: 'What runs at the sites?',
        I: 'What do the sites depend on to do their jobs?',
        S: 'What systems do people at the sites rely on every day?',
        C: 'Which applications run locally at each type of site?',
      },
      'edge.today': {
        D: 'What hardware is at each site?',
        I: 'What does a typical site setup look like?',
        S: 'What’s running at a typical site today, and is it reliable?',
        C: 'What’s the standard per-site infrastructure — server count, storage and hypervisor?',
      },
      'edge.conn': {
        D: 'How reliable is site connectivity?',
        I: 'What happens at a site when the network goes down?',
        S: 'How dependable is the connection back to headquarters?',
        C: 'What’s the WAN bandwidth and uptime at the sites, and are any air-gapped?',
      },
      'edge.mgmt': {
        D: 'How do you patch and monitor the sites?',
        I: 'How does the team keep all those sites up to date?',
        S: 'How does the team look after the sites without being there?',
        C: 'What’s the process and tooling for patching and monitoring remote sites, and how often?',
      },

      // ── VDI ──
      'euc.platform': {
        D: 'Which VDI platform?',
        I: 'What’s the desktop story — Citrix, Horizon, something else?',
        S: 'What does the team use to deliver virtual desktops today?',
        C: 'Which VDI broker and version are you running, and on which hypervisor?',
      },
      'euc.users': {
        D: 'How many users?',
        I: 'How many people log in to virtual desktops every day?',
        S: 'How many people rely on virtual desktops?',
        C: 'How many named and concurrent VDI users do you have, and what’s the peak?',
      },
      'euc.type': {
        D: 'Persistent or non-persistent?',
        I: 'Do users keep their own desktop, or get a fresh one each time?',
        S: 'Do people keep their own personal desktop, or get a clean one at each login?',
        C: 'What’s the split between persistent and non-persistent desktops?',
      },
      'euc.gpu': {
        D: 'Any GPU users?',
        I: 'Do any teams need graphics horsepower — design, engineering, imaging?',
        S: 'Are there users who need extra graphics power for their work?',
        C: 'How many users need GPU acceleration, and for which applications?',
      },
      'euc.pain': {
        D: 'What’s broken about VDI today?',
        I: 'What do users complain about most with their desktops?',
        S: 'What’s been frustrating for users or the team with VDI?',
        C: 'Which VDI issues are most frequent — logins, image updates, cost or performance?',
      },

      // ── Databases ──
      'db.engines': {
        D: 'Which databases do you run?',
        I: 'What databases power your key apps?',
        S: 'Which databases does the team look after?',
        C: 'Which database engines and versions are in production?',
      },
      'db.count': {
        D: 'How many database instances?',
        I: 'How many databases are out there — has it gotten out of hand?',
        S: 'About how many databases does the team manage?',
        C: 'How many database instances are there across prod, dev and test?',
      },
      'db.dbas': {
        D: 'How many DBAs?',
        I: 'Who takes care of the databases — a DBA team or the sysadmins?',
        S: 'Who looks after the databases, and do they have enough help?',
        C: 'How many DBAs do you have, and how is their time split between routine work and projects?',
      },
      'db.provision': {
        D: 'How long to get a new database?',
        I: 'When a developer needs a database, what does that experience look like?',
        S: 'When someone needs a new database, how long do they usually wait?',
        C: 'What’s the average time from database request to a working connection string, and why?',
      },
      'db.clones': {
        D: 'How do dev and test get copies of production?',
        I: 'How do developers get realistic data to work with?',
        S: 'How do the dev and test teams get the copies of data they need?',
        C: 'What’s the process and cycle time for refreshing dev/test copies from production?',
      },
      'db.patch': {
        D: 'Are your databases patched?',
        I: 'How’s patching going — is it keeping up?',
        S: 'How comfortable are you with how current database patching is?',
        C: 'What’s your patch cadence per engine, and how far behind is the oldest version?',
      },
      'db.dbaas': {
        D: 'Using any cloud databases today?',
        I: 'Have you tried cloud database services — how did people like them?',
        S: 'Do you use any cloud database services, and has that worked well?',
        C: 'Which managed database services do you use, and what do they cost per month?',
      },

      // ── Kubernetes ──
      'k8s.stage': {
        D: 'Where are you with Kubernetes?',
        I: 'What’s the container story — are teams excited about Kubernetes?',
        S: 'Where is the team with containers and Kubernetes today?',
        C: 'How many applications run in containers today, and how many clusters are in production?',
      },
      'k8s.platform': {
        D: 'Which Kubernetes platform?',
        I: 'Which Kubernetes platform did the teams land on, and how’s it going?',
        S: 'Which Kubernetes platform is the team using and comfortable with?',
        C: 'Which Kubernetes distributions and versions are in use, and what are the license costs?',
      },
      'k8s.team': {
        D: 'Who runs Kubernetes?',
        I: 'Who’s championing containers — a platform team or the developers?',
        S: 'Who looks after the Kubernetes clusters, and are they stretched?',
        C: 'Which team owns cluster operations, and how is on-call handled?',
      },
      'k8s.stateful': {
        D: 'Any databases or stateful apps on Kubernetes?',
        I: 'Are teams putting databases or other stateful apps in containers yet?',
        S: 'Do any containers hold important data that needs protecting?',
        C: 'What share of containerized workloads are stateful, and how is that data protected?',
      },
      'k8s.where': {
        D: 'Where does Kubernetes need to run?',
        I: 'Where do you see containers running — datacenter, cloud, the edge?',
        S: 'Where do you need Kubernetes to run so it works for everyone?',
        C: 'Which environments need Kubernetes — on-prem, cloud, edge, air-gapped — and how many clusters in each?',
      },
      'k8s.pain': {
        D: 'What’s the biggest Kubernetes headache?',
        I: 'What’s the most frustrating part of running Kubernetes today?',
        S: 'What’s been hardest for the team with Kubernetes?',
        C: 'Which Kubernetes issues cost the most time — upgrades, drift, security or skills?',
      },

      // ── AI ──
      'ai.stage': {
        D: 'Where are you with AI?',
        I: 'What’s the AI buzz like inside the company — what’s got people excited?',
        S: 'Where is the organization with AI today, and how are people feeling about it?',
        C: 'Which AI initiatives are in production, in pilot or planned — and with what budget?',
      },
      'ai.usecases': {
        D: 'Which AI use cases matter most?',
        I: 'What are the AI ideas people are most excited about?',
        S: 'Which AI uses would help people most in their day-to-day work?',
        C: 'Which use cases are prioritized, and how will you measure each one’s success?',
      },
      'ai.data': {
        D: 'Can your data go to public AI services?',
        I: 'How do legal and security feel about sending data to public AI tools?',
        S: 'Are you comfortable with company data going to public AI services?',
        C: 'What data-classification rules govern what can be sent to external LLM APIs?',
      },
      'ai.gpu': {
        D: 'Do you have GPUs?',
        I: 'What’s the GPU situation — any on the way?',
        S: 'Do you have GPUs available, or is that still being worked out?',
        C: 'How many GPUs, and which models, are available or on order?',
      },
      'ai.gov': {
        D: 'What’s the biggest AI risk you’re worried about?',
        I: 'What keeps leadership up at night about AI?',
        S: 'What concerns you most about how AI is being adopted?',
        C: 'Which AI risks are formally tracked — data leakage, cost, access control, lock-in?',
      },
      'ai.owner': {
        D: 'Who owns the AI budget?',
        I: 'Who’s leading the charge on AI — and who’s funding it?',
        S: 'Who looks after the AI budget and decisions?',
        C: 'Which cost center funds AI, and who approves AI spending?',
      },

      // ── Cost ──
      'cost.target': {
        D: 'What’s the savings target?',
        I: 'What would a big cost win look like for leadership?',
        S: 'Is there a savings goal the team has been asked to reach?',
        C: 'What’s the specific savings target — percentage or dollars — and by when?',
      },
      'cost.levers': {
        D: 'Where do the savings have to come from?',
        I: 'Where does leadership think the savings are hiding?',
        S: 'Which areas are you expected to save in?',
        C: 'Which budget lines are targeted — licensing, hardware, cloud or headcount?',
      },
      'cost.model': {
        D: 'Capex, subscription or as-a-service?',
        I: 'How does the company like to buy — any preference from finance?',
        S: 'What buying approach is most comfortable for your finance team?',
        C: 'What are your procurement constraints — capex versus opex, term lengths and cloud commits?',
      },

      // ── Decision ──
      'dec.success': {
        D: 'What result makes this a win?',
        I: 'A year from now, what would make this a success story you’d tell others?',
        S: 'A year from now, what would tell you this was the right decision?',
        C: 'Which metrics will you use to measure success, and what are the targets?',
      },
      'dec.eb': {
        D: 'Who signs off?',
        I: 'Who else needs to be excited about this for it to happen?',
        S: 'Who else will need to be comfortable with this decision?',
        C: 'Who has final budget approval, and what’s their approval threshold?',
      },
      'dec.budget': {
        D: 'Is it budgeted? Above what number does it go higher?',
        I: 'Is there money set aside for this, and who else gets pulled in once it’s big?',
        S: 'Is budget already set aside, and what’s the approval path once it gets bigger?',
        C: 'What’s the budget status, and at what dollar threshold does it need CFO or board approval?',
      },
      'dec.criteria': {
        D: 'What matters most in the decision?',
        I: 'What will make one option stand out from the others for your team?',
        S: 'What’s most important to you and the team as you compare options?',
        C: 'What are the formal evaluation criteria, and how will they be weighted?',
      },
      'dec.process': {
        D: 'What are the steps to a decision?',
        I: 'Walk me through how a decision like this usually comes together.',
        S: 'What steps does a decision like this usually go through here?',
        C: 'What’s the evaluation process — stages, approvals and required documentation?',
      },
      'dec.timeline': {
        D: 'When will you decide?',
        I: 'When are you hoping to have this decided and underway?',
        S: 'What timeline feels realistic for making a decision?',
        C: 'What’s the target decision date, and what milestones lead up to it?',
      },
      'dec.paper': {
        D: 'How do you buy — partner, direct or a contract vehicle?',
        I: 'Which partners do you like working with on purchases like this?',
        S: 'How do purchases usually happen here — is there a partner you like to work with?',
        C: 'What’s the procurement path — partner, contract vehicle, legal and security review — and how long does each step take?',
      },
      'dec.champion': {
        D: 'Who’s driving this internally?',
        I: 'Who’s the biggest fan of making a change?',
        S: 'Who on your side is most invested in seeing this succeed?',
        C: 'Who’s sponsoring this internally, and what’s their role in the decision?',
      },
      'dec.competition': {
        D: 'Who else are you looking at?',
        I: 'Who else is in the conversation, and what do you like about them?',
        S: 'Are there other options you’re considering, so we can make sure we’re a good fit?',
        C: 'Which alternatives are you evaluating, and against which criteria?',
      },
      'dec.nextstep': {
        D: 'What’s the next step, and when?',
        I: 'What would be a great next step — should we get the right people together?',
        S: 'What next step would feel comfortable for you and the team?',
        C: 'What’s the next concrete step, who owns it, and what date should we set?',
      },
    },
  };
})(globalThis.Fivo = globalThis.Fivo || {});
