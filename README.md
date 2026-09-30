# Fiv-o — Discovery Navigator

A guided discovery tool for Nutanix SEs, built for first and second calls. Answer a few questions on screen and each answer decides what to ask next. The call follows the customer's story in five phases — **why now → environment → pain & cost → change & risk → decision** — and every pain gets its number on the spot. A live **Pitch Radar** narrows toward a specific Nutanix sales play and its variant, such as *VMware Exit → Keep-your-array*. At the end you get **CRM-ready notes** (plain text plus MEDDPICC), laid out in the same five phases.

It's one self-contained HTML file. It works offline, needs no install, and never sends data anywhere.

## Use it

1. Grab `dist/fivo-discovery.html` and send it to yourself in Slack (or anywhere).
2. Download it and open it in Chrome, Edge, Safari, or Firefox. Slack's preview doesn't run it; it has to be opened in a browser.
3. Click **Start a new discovery**, enter the account and who's on the call, and start.

Sessions autosave in the browser. Use **Save session (.json)** to keep a copy or move it to another machine, and **Import a saved session** to bring it back. For the next meeting, use **Start call 2** on the home screen, which opens a recap of last call's pains, plays, and open questions.

### The five phases

Questions come in this order, so the conversation doesn't hop between technical and business topics:

1. **Why now** — the event that forced this, the hard date, and what happens if they miss it.
2. **Environment** — one uninterrupted pass through what they run: hypervisor and version, size, storage and its age, servers and warranty, network, sites and who staffs them, team, backup and DR, cloud, then workloads (VDI, databases, Kubernetes, AI).
3. **Pain & cost** — every pain, with its number captured right then. The customer's top-ranked topic goes first.
4. **Change & risk** — intent to leave or stay, how attached the team is, and what worries them about switching (skills, compatibility, compliance-sensitive systems).
5. **Decision** — who signs, the process, budget and the approval threshold, how they buy (direct or partner), competition, and the next step.

A topic that comes up late (vSphere found in the environment pass, or one you add with **+ Topic**) gets a quick catch-up — its deadline and environment questions — before the call carries on where it was. When a new phase starts, a short line says what it's for, with a bridge sentence you can say to move into it.

### Get the number

Pain questions are tagged **Pain? Get the number**. Pick a pain and the cursor lands in its number field, with the exact question to ask ("How many hours does each window take, times the people on it, per month?"). Type the number, pick the unit if it's different (hours a week or month, % of team time, $ a year or month, one-time $, $ per day down, days, people), add what it means for the business if you have it, and press **Enter** to move on. **No number yet** puts it on the next call's agenda.

Hours turn into dollars at a loaded hourly rate ($75 by default; change it in wrap-up), and the side panel keeps a running **Cost of pain**: yearly cost, one-time costs and cost per day of downtime. Downtime estimates count once (the largest), not added together; otherwise the total adds every number as given, so check for overlap before it goes in a business case.

### During the call

The screen has three parts:

- **Phase steps (top):** where you are in the call and how many questions are left in this phase. Click a phase to review its answers (grouped by topic) or change one. A change that makes later answers irrelevant flags them and stops counting them. **+ Topic** adds something the customer raised. The must-asks counter on the right jumps to the next one you haven't asked.
- **The question (center):** one at a time, with the next two listed below it. Pick an answer by clicking or pressing its number. Pains ask for their number, and some answers show a short coaching tip or a risk.
- **How to ask it:** a dropdown under each question with four phrasings, one per DISC style (Dominance, Influence, Steadiness, Conscientiousness), plus why it matters and what to listen for. Set the buyer's style in setup or from the dropdown, and their phrasing shows right under every question.
- **Pitch panel (right), Pitch tab:** the likely Nutanix pitch and its version, the **cost of pain** so far (with a link to the next pain still missing its number), then **suggested technology** — specific products (Flow, NDB, NC2, NCM Self-Service…) once their answers point clearly to them. Mark each **Interested** or **Not interested**. "Not interested" removes it from suggestions and the license. If it was the only reason for a pitch, the pitch and its questions are set aside, so the call moves on without it.
- **Pitch panel, License tab:** a license sketch built from what they need: the right NCI edition (or NCI-Compute for external storage), switching to the NCP bundle when NCM is needed. It also covers add-ons (Advanced Replication, Security, NUS, Data Lens, NDB, NKP, NAI, NC2, Edge, VDI), what's included at no extra cost (NKP Starter, Move, 1 TiB Files/Objects…), cheaper or simpler alternatives, and anything they turned down. It's in the CRM notes too.

Twenty minutes in, if Decision questions are still open, Fiv-o offers to jump to them before the call ends.

| Key | Action |
| --- | --- |
| `1`–`9`, `0` | Answer the question |
| `Enter` | Done (multi-select) / next question; in a number field, save it and move on |
| `↑` `↓` | Switch to an "up next" question |
| `S` / `B` | Skip / undo the last answer |
| `H` | How to ask it (DISC phrasings and coaching) |
| `N` / `Q` | Add a note / capture a quote |
| `/` | Search every question (opens topics not in play yet) |
| `P` | Open the pitch card |
| `L` | Switch the side panel between Pitch and License |
| `C` | Coaching on/off |
| `W` | Wrap up |
| `Esc` | Close the top panel; with nothing open, hide the screen |
| `?` | Shortcuts and settings |

## Edit the content

Everything that drives the tool lives in plain data files, with no logic to touch:

| File | What's in it |
| --- | --- |
| `src/content/questions.js` | The question bank, in call order: phase, options, signals to plays, follow-up conditions, the "get the number" question for each pain, coaching |
| `src/content/plays.js` | 12 plays: variants, talk tracks per persona, proof points with sources, objections, next steps |
| `src/content/competitors.js` | Landmine questions and counters per competitor |
| `src/content/disc.js` | Four DISC phrasings for every question |
| `src/content/tech.js` | Technologies Fiv-o can suggest: the evidence that triggers each, and the pitches it underpins |
| `src/content/licensing.js` | Nutanix packaging facts behind the license sketch (NCI/NCM/NCP editions, add-ons, inclusions) with sources |
| `src/content/meta.js` | The five phases (with bridge lines), units for pain numbers and the default hourly rate, personas, industries, topics, MEDDPICC letters |

Each question has a `phase` (1–5). Each option carries `signals` such as `{ vmw: 15, 'vmw.ext': 12 }`, which add weight to a play or to one of its variants. A question's `when` controls when it appears, e.g. `{ any: ['env.storage:san'] }`, and may only depend on its own or an earlier phase. A pain option carries `cost: ['the question to ask', 'unit']`. The file headers document every field.

Pitch and licensing content comes from **public** Nutanix sources (Sept 2026). Proof points tagged `verify: true` — and the license sketch as a whole — should be checked against current internal enablement, Sizer and the partner quote before you share numbers. Overlay your own battlecards freely.

## Build and test

Requires Node 18+. There are no dependencies.

```bash
npm test
```

```bash
npm run build
```

`npm test` runs content lint (broken references, unreachable questions, missing battlecards, phase order, a number question for every pain), engine tests, scripted customer scenarios, and simulated calls that check the flow never steps back a phase except to catch up on a topic that just came up. `npm run build` writes `dist/fivo-discovery.html`, and the build refuses to write it if the page would reference an external resource.

Code layout: `src/engine/` (routing, scoring, pain costs, MEDDPICC; runs under Node too), `src/report/crm.js` (notes), `src/ui/` (screens, no framework), `build.mjs` (inlines everything into one file).
