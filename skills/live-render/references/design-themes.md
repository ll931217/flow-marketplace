# Live Render — Design Themes Reference

These themes are distilled from the beautiful-html-templates aesthetic vocabulary.
Each is a complete set of CSS variables + font imports. Replace `theme.css` in
the project root to switch themes.

## Font loading: use @fontsource-variable (not Google Fonts CDN)

All themes here load fonts via [@fontsource-variable](https://fontsource.org/) packages instead of `@import url('https://fonts.googleapis.com/...')`. Benefits:

- **Self-hosted** — no network round-trip to Google on first paint, no privacy concerns, works offline / behind a firewall
- **Variable axes** — a single woff2 file per family covers every weight (and optical size where supported), much smaller than loading 4–7 static weights
- **Build-time bundled** — Vite fingerprints and caches the font files alongside the rest of the asset graph
- **Tree-shaken** — Vite only ships the subsets actually imported

Install whatever the chosen theme needs (variable variants where they exist; fall back to static `@fontsource/...` for families without a variable axis — currently IBM Plex):

```bash
# Signal
npm install @fontsource-variable/inter @fontsource-variable/jetbrains-mono
# Broadside
npm install @fontsource-variable/playfair-display @fontsource-variable/jost
# Vellum
npm install @fontsource-variable/cormorant-garamond @fontsource-variable/lora
# Creative Mode
npm install @fontsource-variable/syne @fontsource-variable/bricolage-grotesque
# Cobalt Grid (IBM Plex has no variable axis — use static @fontsource)
npm install @fontsource/ibm-plex-mono @fontsource/ibm-plex-sans
```

In `theme.css`, the import path is just the package name (Vite resolves it). The CSS font-family for variable fonts is `<Family Name> Variable`.

---

## Signal (Technical / Engineering)

Dark, grid-aligned, high-contrast. The accent is the only color — everything
else is grayscale. Feels like a terminal crossed with a design system.

Best for: architecture explanations, codebase walkthroughs, system diagrams.

```css
@import '@fontsource-variable/inter';
@import '@fontsource-variable/jetbrains-mono';

:root {
  --bg: #0f0f0f;
  --surface: #1a1a1a;
  --surface-2: #232323;
  --border: #2a2a2a;
  --text-primary: #f0f0f0;
  --text-secondary: #666;
  --accent: #e8ff47;
  --accent-dim: rgba(232, 255, 71, 0.08);
  --font-display: 'Inter Variable', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
  --radius: 3px;
  --space: 8px;
}
```

---

## Broadside (Planning / Strategy)

Editorial serif, navy + ivory, structured two-column layout. Commands
authority. Feels like a well-designed annual report or strategy deck.

Best for: roadmaps, planning sessions, multi-phase explanations, decision comparisons.

```css
@import '@fontsource-variable/playfair-display';
@import '@fontsource-variable/jost';

:root {
  --bg: #0a1628;
  --surface: #0f1f3d;
  --surface-2: #152548;
  --border: #1e3060;
  --text-primary: #f5f0e8;
  --text-secondary: #8899bb;
  --accent: #c8a84b;
  --font-display: 'Playfair Display Variable', serif;
  --font-body: 'Jost Variable', sans-serif;
  --font-mono: ui-monospace, monospace;
  --radius: 2px;
  --space: 8px;
}

body { font-family: var(--font-body); }
h1, h2, h3 { font-family: var(--font-display); font-style: italic; }
```

---

## Vellum (Storytelling / Concepts)

Warm cream canvas with serif typography. Generous padding, no borders, soft
shadows. Feels like high-quality editorial print.

Best for: concept explanations, onboarding, narrative walkthroughs, tutorials.

```css
@import '@fontsource-variable/cormorant-garamond';
@import '@fontsource-variable/lora';

:root {
  --bg: #f9f5ec;
  --surface: #f2ece0;
  --surface-2: #ede5d4;
  --border: #ddd4c0;
  --text-primary: #1a1208;
  --text-secondary: #7a6a52;
  --accent: #c0832a;
  --font-display: 'Cormorant Garamond Variable', serif;
  --font-body: 'Lora Variable', serif;
  --font-mono: 'Courier New', monospace;
  --radius: 2px;
  --space: 8px;
}

body { font-family: var(--font-body); background: var(--bg); color: var(--text-primary); }
h1, h2 { font-family: var(--font-display); font-size: clamp(2rem, 5vw, 4rem); font-weight: 600; }
```

---

## Creative Mode (Educational / Fun)

Bold, multi-color, large display type. Confident and energetic. Feels like
a well-designed magazine or creative brief.

Best for: fun concept explanations, creative brainstorming, educational content,
anything where the tone is enthusiastic rather than serious.

```css
@import '@fontsource-variable/syne';
@import '@fontsource-variable/bricolage-grotesque';

:root {
  --bg: #f5f0ff;
  --surface: #ffffff;
  --surface-2: #ede5ff;
  --border: #d4c6ff;
  --text-primary: #1a0a2e;
  --text-secondary: #6b5b95;
  --accent: #ff3c6e;
  --accent-2: #00e5a0;
  --accent-3: #ffe01b;
  --font-display: 'Syne Variable', sans-serif;
  --font-body: 'Bricolage Grotesque Variable', sans-serif;
  --font-mono: ui-monospace, monospace;
  --radius: 8px;
  --space: 8px;
}

body { font-family: var(--font-body); }
h1, h2 { font-family: var(--font-display); font-weight: 800; }
```

---

## Cobalt Grid (Data / Metrics)

Dense, data-forward, cool blue palette. Grid-aligned cells. Feels like a
Bloomberg terminal or a BI dashboard built with taste.

Best for: data comparisons, metrics dashboards, performance analysis, anything
where density of information is a feature not a bug.

```css
/* IBM Plex has no variable axis yet — use static @fontsource subsets */
@import '@fontsource/ibm-plex-sans/400.css';
@import '@fontsource/ibm-plex-sans/500.css';
@import '@fontsource/ibm-plex-sans/600.css';
@import '@fontsource/ibm-plex-mono/400.css';
@import '@fontsource/ibm-plex-mono/500.css';
@import '@fontsource/ibm-plex-mono/600.css';

:root {
  --bg: #00091a;
  --surface: #001433;
  --surface-2: #001f4d;
  --border: #003080;
  --text-primary: #c8e0ff;
  --text-secondary: #4070a0;
  --accent: #0099ff;
  --accent-pos: #00e5a0;
  --accent-neg: #ff4560;
  --font-display: 'IBM Plex Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  --radius: 2px;
  --space: 8px;
}

body { font-family: var(--font-mono); }
.label { font-family: var(--font-display); }
```

---

## Applying a Theme

1. Copy the desired theme block into `src/theme.css` (replace the existing content)
2. Vite HMR will instantly apply it — no restart needed
3. All components use CSS variables, so they adapt automatically

### Theme-Agnostic Component Pattern

Write all components using only CSS variables so they work across all themes:

```tsx
// Good — uses variables
<div style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>

// Avoid — hardcoded colors break theme switching
<div style={{ background: '#1a1a1a', color: '#f0f0f0' }}>
```

### Typography Scale

Regardless of theme, use this consistent scale:

```css
/* Display heading */
font-size: clamp(2rem, 5vw, 4.5rem); font-weight: 700; line-height: 1.1;

/* Section heading */
font-size: 1.5rem; font-weight: 600; line-height: 1.3;

/* Body */
font-size: 1rem; line-height: 1.6; font-weight: 400;

/* Label / caption */
font-size: 0.75rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;

/* Mono / code */
font-family: var(--font-mono); font-size: 0.8125rem;
```
