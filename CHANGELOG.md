# Changelog

What changed in Strata Vid and why. Every change adds an entry here in the same PR.

Group entries by day under `## YYYY-MM-DD`, newest day first. Each entry: a bold one-line title naming
the work and its branch (and PR number once known), one or two sentences on what was asked and what
changed the plan, then bullets naming each file or folder touched and what changed. Say **new** for new
files and call out corrections to earlier claims. Plain prose. Do not rewrite older entries except to fix
a factual error. Work before 2026-11-12 is in the git history only.

## 2026-11-12

**Docs slimmed to what is true now** (branch `claude/project-thread-snbsl3`). Jonathan asked for a
review of the project's docs and chose to slim and rewrite them: the README still called the app early
development and listed export, audio and save/load as planned; the roadmap contradicted its own section
files and its links were broken.
- `README.md`: rewritten. Says what the editor does, the known gaps, how to run it, the stack including
  strata-react, and the contributor rules. **Corrections**: export, audio, save/load and undo exist;
  integration tests are Jest in jsdom, not Playwright; Node 26, not 20.
- `docs/ARCHITECTURE.md`: rewritten from the code. Keeps the data model, GPX sync and the two renderers;
  adds the worker export (`WorkerCompositor`, `exportWorker`), the audio graph, saving, and the current
  layout. **Corrections**: `Clip.syncOffset` is the absolute GPX time (epoch ms) at the clip's start, not
  an offset in seconds; `Compositor.ts` is used only by its tests.
- `docs/PORT.md`: **new**. Where the move onto strata-react stands: what is in use, what is released but
  not swapped in (#75–#79), and what waits on strata-react (#68, #80, #81, #116, #117, #121, #122).
- `CHANGELOG.md`: **new**, seeded with PR #137 below.
- `AGENTS.md`: adds the changelog, dependency and port rules.
- Removed: `docs/IMPLEMENTATION.md`, `docs/QUICKSTART.md`, `docs/complete/` and `docs/sections/` (the
  A–M task lists, finished work recorded as ticked boxes), and the app template's leftovers
  `QUICK_START.md`, `TEMPLATE_CUSTOMIZATION.md` and `.env.example` (the app reads no environment variables).
  All are in git history.
- `.node-version`: 20 → 26, to match `.nvmrc` and `engines`.

**First move onto strata-react** (branch `claude/project-thread-nyofjj`, PR #137). Every dependency
updated, Node 26, TypeScript 7, and strata-react 1.0.6's released components in place of hand-built ones.
- `package.json`: strata-react with React Router and TanStack Query as its peers; ts-jest removed
  (unused, no TypeScript 7 release; Jonathan approved).
- `src/index.css`, `src/theme.css`, `src/theme.generated.css`, `src/main.tsx`, `index.html`: strata-react's
  roles and a theme seeded from OS-map contour orange; dark by default.
- `src/components/`: one command list drives keys, menus, the context menu, the command menu and the
  shortcuts dialog; `Dialog`/`AlertDialog`, toasts and `Alert`, toolbars and toggles, `NumberField`,
  `Slider` and `ColorField` with units, the `Inspector`, and export as a `JobStatus`. Compact density, a
  wider track header, and an inspector that no longer overflows.
- `jest.base.config.js`, `tests/utils/babelImportMeta.cjs`: Jest compiles ESM-only packages and removes
  `import.meta`. Integration tests query by role and name.
- Framework gaps found were filed as strata-react #116 and #117.
