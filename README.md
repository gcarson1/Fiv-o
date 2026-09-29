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
- **The question (center):** one at a time, with a one-line "why ask this" and the next two questions listed below it. Pick an answer by clicking or pressing its number. Pains ask you to quantify them, and some answers show a short coaching tip or a risk. **+ Note**, **+ Quote** and **Listening tips** stay tucked away until you want them.
- **Likely pitch (right):** the best-fit Nutanix pitch and the version of it that fits, what's left to confirm, a few alternatives, and a MEDDPICC strip. **Open pitch card** shows the pitch, proof, objections and next steps in tabs.

Twenty minutes in, if who-signs, timing or next step are still open, Fiv-o suggests asking them before the call ends.

| Key | Action |
| --- | --- |
| `1`–`9`, `0` | Answer the question |
| `Enter` | Done (multi-select) / next question |
| `↑` `↓` | Switch to an "up next" question |
| `S` / `B` | Skip / undo the last answer |
| `N` / `Q` | Add a note / capture a quote |
| `/` | Search every question (opens topics not in play yet) |
| `P` | Open the pitch card |
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
