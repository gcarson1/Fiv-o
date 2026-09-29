# Fiv-o — Discovery Navigator

A guided discovery tool for Nutanix SEs, built for first and second calls. Answer a few questions on screen and each answer decides what to ask next. A live **Pitch Radar** narrows toward a specific Nutanix sales play and its variant, such as *VMware Exit → Keep-your-array*. At the end you get **CRM-ready notes** (plain text plus MEDDPICC).

It's one self-contained HTML file. It works offline, needs no install, and never sends data anywhere.

## Use it

1. Grab `dist/fivo-discovery.html` and send it to yourself in Slack (or anywhere).
2. Download it and open it in Chrome, Edge, Safari, or Firefox. Slack's preview doesn't run it; it has to be opened in a browser.
3. Click **Start new discovery**, fill in the 30-second setup, and start the call.

Sessions autosave in the browser. Use **Save session (.json)** to keep a copy or move it to another machine, and **Import** to bring it back. For the next meeting, use **Start call 2** on the home screen, which opens a recap of last call's pains, plays, and open questions.

### During the call

| Key | Action |
| --- | --- |
| `1`–`9`, `0` | Answer the active question |
| `⏎` | Done (multi-select) / continue |
| `↑` `↓` | Move between the on-screen questions |
| `S` / `B` | Skip / undo last answer |
| `N` / `Q` | Add a note / capture a verbatim quote |
| `/` | Search every question (opens locked topics automatically) |
| `P` | Open the leading pitch card |
| `C` | Coaching hints on/off |
| `W` | Wrap up |
| `Esc` | Privacy blur (for screen-sharing) · closes panels |

- **Path map (left):** Topics in the order they matter. Click a topic to focus it, or click any answer to change it. Downstream answers that no longer apply get a ⚠ and stop counting toward the scores.
- **Question cards (center):** The current question plus the next two, so you can answer out of order as the conversation wanders. A ⚡ **Splits X vs Y** tag marks the question that best separates the leading options.
- **Pitch Radar (right):** Every play ranked live. Hover over a play to see why it scored that way. A play is **ready** once confidence is high *and* its qualifying questions are answered. The pitch card has persona talk tracks, before/after, proof points with sources, objections, competitor landmines, and next steps.
- **Pains:** Picking a pain answer asks for its *impact* and a *metric*, so pains get quantified on the call.

## Edit the content

Everything that drives the tool lives in plain data files, with no logic to touch:

| File | What's in it |
| --- | --- |
| `src/content/questions.js` | The question bank: options, signals to plays, follow-up conditions, coaching |
| `src/content/plays.js` | 12 plays: variants, talk tracks per persona, proof points with sources, objections, next steps |
| `src/content/competitors.js` | Landmine questions and counters per competitor |
| `src/content/meta.js` | Personas, industries, topic modules, MEDDPICC letters |

Each option carries `signals` such as `{ vmw: 15, 'vmw.ext': 12 }`, which add weight to a play or to one of its variants. A question's `when` controls when it appears, e.g. `{ any: ['env.storage:san'] }`. The file headers document every field.

Pitch content comes from **public** Nutanix sources (Sept 2026). Proof points tagged `verify: true` should be checked against current internal enablement before you quote them. Overlay your own battlecards freely.

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
