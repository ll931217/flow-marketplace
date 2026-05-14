# Template Anatomy

Read this before Phase 3 (scaffolding) and Phase 4 (authoring). Every file
in `assets/presentation-template/` has an editing contract — some files
are bundled infrastructure you should never touch, others are skeletons
meant to be replaced wholesale.

## Files at a glance

| Path | Role | Edit? |
| --- | --- | --- |
| `package.json` | Vite + React + framer-motion deps | Only if adding a *new* dep |
| `vite.config.ts` | Plain React plugin, relative base | No |
| `tsconfig.json` | Strict, jsx: react-jsx, noUnusedLocals | No |
| `index.html` | Single root div + main.tsx | Only the `<title>` |
| `public/favicon.svg` | Yellow play-triangle on dark | Replace if the project has its own brand |
| `src/main.tsx` | Mount root, import theme | No |
| `src/theme.css` | Full design system + present-mode chrome | No |
| `src/Presenter.tsx` | Slide engine, hotkeys, auto-pagination | **No** — never modify |
| `src/Markdown.tsx` | Theme-aware ReactMarkdown wrapper | No |
| `src/App.tsx` | The `slides` array goes here | Yes — replace the example wiring |
| `src/sections/_example.tsx` | Styling cheat-sheet | **Delete** before shipping |
| `src/sections/<Name>.tsx` | Authored sections | Create one per slide |

## Why the off-limits list

`Presenter.tsx` and `theme.css` are versioned, hand-tuned artifacts copied
out of the working archive-v1 deck. They handle subtle cases — the
measurement lifecycle in `SlideHost`, the clamping in `AutoPaginatedHost`,
the `present-vdots` rendering when `pages > 1`, the keyboard map. Editing
them produces hard-to-spot regressions (especially around resize + sub-page
clamping). If a user genuinely needs different chrome, that is a different
problem: bump the bundled template under a new version, do not hot-patch.

`vite.config.ts` uses `base: './'` so the built deck works when served
from a subpath (e.g., behind a path-prefixed proxy or as a static drop on
S3). Don't remove this unless you know the deployment will always live at
root.

`tsconfig.json` has `noUnusedLocals` and `noUnusedParameters` on. Authored
sections will fail `pnpm typecheck` if you import something and don't
use it. Honour the strictness; don't disable.

## Author surface

The agent's edits are confined to three things:

1. **`src/App.tsx`** — replace the `slides` array. Import each authored
   section, wire it as either `node` (single-page) or `subsections`
   (multi-page). Keep the `'NN · Label'` convention so the chrome reads
   well.
2. **`src/sections/*.tsx`** — one file per slide (or per slide-with-
   subsections). Compose from the styling vocabulary documented in
   `section-patterns.md`. Each section should be a *function component*
   exporting the obvious name (`Title`, `Today`, `Architecture`, …).
3. **`index.html` `<title>`** and optionally `public/favicon.svg` if the
   deck has its own brand.

Anything outside these three surfaces is a smell. If you find yourself
wanting to add a new top-level file (`src/api.ts`, `src/hooks.ts`,
`src/utils/*`), stop and ask whether it should live in a section instead.
The deck is meant to be self-contained, hand-authored, and reviewable in a
single sitting — auxiliary modules push it away from that.

## Install command

The template doesn't ship a lockfile so the user's package manager picks
fresh versions inside their constraints. Use whatever the user's other
projects use:

- `pnpm install` (preferred for monorepo contexts)
- `npm install` (default)
- `yarn` (legacy)

If unsure, check whether the project root has `pnpm-lock.yaml`,
`package-lock.json`, or `yarn.lock` and match.

## Verifying

`pnpm typecheck` must pass before declaring success. `pnpm dev` should
start without console errors. Don't run `pnpm build` unless the user
asked to deploy — it's slow and not part of the authoring loop.
