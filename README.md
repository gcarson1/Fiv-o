# Fiv-o — Discovery Navigator

A guided discovery tool for Nutanix SEs, built for first and second calls. Answer a few questions on screen and each answer decides what to ask next. A live **Pitch Radar** narrows toward a specific Nutanix sales play and its variant, such as *VMware Exit → Keep-your-array*. At the end you get **CRM-ready notes** (plain text plus MEDDPICC).

It's one self-contained HTML file. It works offline, needs no install, and never sends data anywhere.

## Use it

1. Grab `dist/fivo-discovery.html` and send it to yourself in Slack (or anywhere).
2. Download it and open it in Chrome, Edge, Safari, or Firefox. Slack's preview doesn't run it; it has to be opened in a browser.
3. Click **Start a new discovery**, enter the account and who's on the call, and start.

Sessions autosave in the browser. Use **Save session (.json)** to keep a copy or move it to another machine, and **Import a saved session** to bring it back. For the next meeting, use **Start call 2** on the home screen, which opens a recap of last call's pains, plays, and open questions.

### During the call

The screen has three parts:

- **Topic steps (top):** where you are in the call. Click any topic to review its answers or change one. A change that makes later answers irrelevant flags them and stops counting them. **+ Topic** adds something the customer raised. The must-asks counter on the right jumps to the next one you haven't asked.
- **The question (center):** one at a time, with the next two listed below it. Pick an answer by clicking or pressing its number. Pains ask you to quantify them, and some answers show a short coaching tip or a risk.
- **How to ask it:** a dropdown under each question with four phrasings, one per DISC style (Dominance, Influence, Steadiness, Conscientiousness), plus why it matters and what to listen for. Set the buyer's style in setup or from the dropdown, and their phrasing shows right under every question.
- **Pitch panel (right), Pitch tab:** the likely Nutanix pitch and its version, then **suggested technology** — specific products (Flow, NDB, NC2, NCM Self-Service…) once their answers point clearly to them. Mark each **Interested** or **Not interested**. "Not interested" removes it from suggestions and the license. If it was the only reason for a pitch, the pitch and its questions are set aside, so the call moves on without it.
- **Pitch panel, License tab:** a license sketch built from what they need: the right NCI edition (or NCI-Compute for external storage), switching to the NCP bundle when NCM is needed. It also covers add-ons (Advanced Replication, Security, NUS, Data Lens, NDB, NKP, NAI, NC2, Edge, VDI), what's included at no extra cost (NKP Starter, Move, 1 TiB Files/Objects…), cheaper or simpler alternatives, and anything they turned down. It's in the CRM notes too.

Twenty minutes in, if who-signs, timing or next step are still open, Fiv-o suggests asking them before the call ends.

| Key | Action |
| --- | --- |
| `1`–`9`, `0` | Answer the question |
| `Enter` | Done (multi-select) / next question |
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
| `src/content/questions.js` | The question bank: options, signals to plays, follow-up conditions, coaching |
| `src/content/plays.js` | 12 plays: variants, talk tracks per persona, proof points with sources, objections, next steps |
| `src/content/competitors.js` | Landmine questions and counters per competitor |
| `src/content/disc.js` | Four DISC phrasings for every question |
| `src/content/tech.js` | Technologies Fiv-o can suggest: the evidence that triggers each, and the pitches it underpins |
| `src/content/licensing.js` | Nutanix packaging facts behind the license sketch (NCI/NCM/NCP editions, add-ons, inclusions) with sources |
| `src/content/meta.js` | Personas, industries, topic modules, MEDDPICC letters |

Each option carries `signals` such as `{ vmw: 15, 'vmw.ext': 12 }`, which add weight to a play or to one of its variants. A question's `when` controls when it appears, e.g. `{ any: ['env.storage:san'] }`. The file headers document every field.

Pitch and licensing content comes from **public** Nutanix sources (Sept 2026). Proof points tagged `verify: true` — and the license sketch as a whole — should be checked against current internal enablement, Sizer and the partner quote before you share numbers. Overlay your own battlecards freely.

## Build and test

Requires Node 18+. There are no dependencies.

```bash
npm test
```

```bash
npm run build
```

`npm test` runs content lint (broken references, unreachable questions, missing battlecards), engine tests, and scripted customer scenarios. `npm run build` writes `dist/fivo-discovery.html`, and the build refuses to write it if the page would reference an external resource.

Code layout: `src/engine/` (routing, scoring, MEDDPICC; runs under Node too), `src/report/crm.js` (notes), `src/ui/` (screens, no framework), `build.mjs` (inlines everything into one file).
