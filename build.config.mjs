// Load order for the inlined bundle. Content → engine → report run in Node tests too;
// ui files need a DOM and are browser-only.
export const CORE = [
  'src/content/meta.js',
  'src/content/plays.js',
  'src/content/competitors.js',
  'src/content/questions.js',
  'src/engine/state.js',
  'src/engine/scoring.js',
  'src/engine/meddpicc.js',
  'src/engine/router.js',
  'src/report/crm.js',
];

export const UI = [
  'src/ui/dom.js',
  'src/ui/app.js',
  'src/ui/home.js',
  'src/ui/interview.js',
  'src/ui/radar.js',
  'src/ui/wrapup.js',
  'src/ui/hotkeys.js',
  'src/ui/main.js',
];
