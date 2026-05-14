# Canvas composition — visual design rules

Default Claude output, left alone, drifts into AI-slop visuals: emoji-encrusted cards, eight-colour rainbow palettes, no grid, no hierarchy, every region the same size, edges crossing in every direction, marketing-fluff labels. This document is the antidote.

These rules are **load-bearing**. When you compose or mutate the canvas, apply them. They are calibrated to the four built-in render paths (`node` / `edge` / `region` / `annotation`) — don't fight the renderer.

---

## The slop-detection checklist

Before you call `PATCH /api/world`, scan your patch against this list. If any item is true, your output looks like AI slop. Fix before shipping.

- [ ] Every node has an emoji icon "to make it pop"
- [ ] More than 3 distinct accent colours across the whole world
- [ ] Accent colours picked from the generic AI-techy purple/blue/cyan trio with no semantic meaning
- [ ] Node titles read like marketing copy ("🚀 Powerful Service Engine", "✨ Smart Validator")
- [ ] Node widths vary at random — 180, 220, 240, 260, 220 in the same column
- [ ] Regions wrap their contents with 4px of breathing room
- [ ] Two regions touch or overlap
- [ ] An edge crosses three other edges to reach its target
- [ ] An edge label is longer than its source node's title
- [ ] Three or more sentences crammed into `subtitle`
- [ ] `desc` is an empty string or a restatement of `title`
- [ ] Two nodes in the same row use different heights
- [ ] You used a region as decoration with nothing inside it

---

## Palette — three accents, max

Pick **one primary accent** for the conceptual centre of the canvas. Pick **one or two supporting accents** for adjacent concept clusters. Everything else uses neutral surface tones from the renderer's defaults. Never more than three accents in one world.

Use this calibrated palette as the default. Each colour pairs a saturated hex (for accent strips, edge strokes, region borders) with a translucent companion (for region fills, edge labels) so the renderer has both available.

| Role        | Hex        | Translucent (rgba)              | When to use                                                  |
| ----------- | ---------- | ------------------------------- | ------------------------------------------------------------ |
| Primary     | `#6a8aff`  | `rgba(106,138,255,0.18)`        | The system's centre of mass. The thing the canvas is *about*. |
| Secondary   | `#7ec699`  | `rgba(126,198,153,0.18)`        | Supporting cluster — data, gates, capabilities.              |
| Tertiary    | `#f3b562`  | `rgba(243,181,98,0.18)`         | A second supporting cluster — flow, events, time-ordered.    |
| Warning     | `#e07b91`  | `rgba(224,123,145,0.18)`        | Use sparingly — call-outs, deprecations, blocked paths.      |
| Muted       | `#9aa3b8`  | `rgba(154,163,184,0.16)`        | Background nodes, inactive states, "context only".           |

**Rejected** (because they read as slop):

- Neon purples (`#a855f7`, `#d946ef`) when used as the *primary* — fine as a third accent for a special cluster, never as the centre.
- Pure black (`#000`) and pure white (`#fff`) — too harsh against the renderer's dark surface.
- Pastel rainbow gradients — colour should carry meaning, not decoration.

Colour carries semantic load. If two clusters share the same accent, they belong to the same conceptual layer. If two nodes have different accents, the reader expects them to differ in kind, not just in name.

---

## Typography & copy

The renderer composes three text slots per node: `title`, `subtitle`, `desc` (tooltip). Each has a job. Don't mix them.

| Slot      | Length       | Voice                | What goes here                                                  |
| --------- | ------------ | -------------------- | --------------------------------------------------------------- |
| `title`   | 1–4 words    | Noun phrase, sentence case | The thing this entity *is*. "AMS Server", not "The Server That Handles AMS Requests". |
| `subtitle`| 1 short phrase, ≤ 6 words | Classifier, lowercase ok | Its type or role. "PMS Role", "column gate", "child · trader-only scope". |
| `desc`    | 1–3 sentences | Full sentences, neutral | Why it exists, what it touches, what's distinctive. Hover-only — assume the reader already sees `title` and `subtitle`. |

**Copy bans:**

- Marketing adjectives: powerful, smart, intelligent, seamless, robust, scalable, modern, beautiful, elegant.
- Emojis inside `title` or `subtitle`. (Icon goes in `metadata.icon`, separately.)
- All-caps titles. The renderer applies its own type styling — let it.
- Trailing punctuation on `title` / `subtitle`. Periods belong in `desc`.
- Restating the obvious in `desc` ("This is the AMS Server node. It represents the AMS Server.").

**Icon discipline.** `metadata.icon` accepts a single emoji. Use it only when it adds information at a glance:

- ✅ A geometric mark that classifies the node (👁️ for read-gates, ✏️ for write-gates, 🔒 for locked scope).
- ❌ Decorative chrome (🚀, ✨, 🎯, 💡, 🔥) — these are slop tells.

When in doubt, **omit the icon**. A typographically clean card beats an emoji-crusted one every time.

---

## Spatial composition — the 8px grid

The renderer is pixel-accurate Canvas2D. Random coordinates produce visual noise. Snap every spatial number to **multiples of 8**. Within that constraint, follow these size tiers.

### Node sizes (width × height)

- **Standard:** 220 × 64 — default for most concept nodes.
- **Wide:** 280 × 64 — when the title is long but you can't shorten it.
- **Compact:** 160 × 64 — for tight clusters of small classifiers (column gates, tokens, enum-like things).
- **Banner:** 540 × 64 — for impl-plan steps or anything that wants its own row.
- Height stays at **64 unless** the design genuinely needs a taller card (rare). Mixing heights in the same column is a slop tell.

**Within a row or column, every node must be the same width.** Variation reads as carelessness.

### Region sizes

- Inner padding: **≥ 24px** between region edge and any contained node.
- Vertical gap between two regions: **≥ 32px**.
- Horizontal gap between two regions: **≥ 32px**.
- Never let regions touch or overlap. Overlap is the strongest slop signal — it tells the reader the author didn't lay out the canvas.

### The default 1600×900 canvas

Reserve 16–32px outer margin from every canvas edge. The usable area is roughly 1536 × 836. A clean split:

- Two-column layout: ~760 px per column with a 32 px gutter at x ≈ 800.
- Four-column layout: ~370 px per column with 32 px gutters.
- Top/bottom half split: y ≈ 480 is the natural divider (32 px region gap above/below).

Stick to one of these grids unless the content actively argues otherwise.

---

## Edge discipline

Edges are the loudest source of visual noise. Aggressive edge hygiene is non-negotiable.

1. **Cull before adding.** Every edge competes for visual attention. If an edge restates a relationship already implied by region containment or adjacency, delete it. A cluster of gates inside a region called "Column Gates" doesn't need an edge from the region to each gate.
2. **Avoid crossings.** If two edges must cross, reconsider node positions before accepting the crossing. Crossings imply the author gave up.
3. **One edge per direction, per pair.** If you find yourself adding three parallel edges between A and B for three separate facts, fold those facts into the one edge's label or move them to the nodes' `desc`.
4. **Edge label conventions:**
   - ≤ 4 words. Verb or short noun phrase. Lowercase. No punctuation.
   - "carries", "assigned at", "parent of", "writes to" — good.
   - "This role is then assigned to the following scope node:" — bad.
   - Leave the label empty (`""`) for edges whose meaning is obvious from context (e.g., a contains-relationship inside a region).
5. **Dashed vs solid:**
   - Solid: primary, structural, synchronous, "is/has" relationships.
   - Dashed: derived, asynchronous returns, inheritance, "soft" relationships.
   - Don't dash for variety. Dash carries meaning.
6. **Edge opacity:** Use the translucent companion (`rgba(...,0.4–0.7)`) for accents on edges. Fully saturated edge colours overpower the nodes they connect.
7. **Numbered sequence edges.** When edges represent a time-ordered flow, prefix the label with `1.`, `2.`, etc. Numbers do the work of "first then next" without extra prose.

---

## Region composition — semantic containers, not decoration

A region is a labeled cluster. It earns its place only if its contents share a single concept that benefits from being named.

- **Title.** Sentence case, ≤ 8 words. Describes what's *inside*, not what the cluster *does* ("Authentik Groups" ✅, "Manage Authentik Groups Here" ❌).
- **One region per concept layer.** Don't nest. Don't overlap. If two clusters are siblings, give each its own region and let whitespace do the rest.
- **Region accent = the cluster's role colour.** Match the region accent to the dominant node accent inside it. The translucent fill the renderer derives from `accent` is what gives the region its presence.
- **Don't create a region for a single node.** That's a card with a hat.

---

## Composition patterns by intent

When the user asks for a canvas, pick one of these archetypes and stick to its grammar. Mixing archetypes in one canvas is what creates slop.

### 1. Concept map (taxonomy / role model / domain glossary)

- Layered left-to-right or top-to-bottom in order of abstraction.
- Each layer = one region.
- Edges between adjacent layers only. Skip-layer edges only when essential.
- 1–2 accents.

### 2. Sequence / flow (request lifecycle, pipeline, user journey)

- Single horizontal row of actor nodes at canvas mid-height.
- Numbered edges (`1.`, `2.`, …) connecting them in time order.
- Solid edges for forward calls, dashed edges for returns.
- One accent (tertiary `#f3b562` is the default for time-ordered flows).

### 3. Architecture diagram (components and their connections)

- Cluster by deployment unit or layer (frontend / backend / data / external).
- One region per cluster, primary accent for the cluster the canvas is about, neutral muted for everything else.
- Edges only for runtime connections; structural containment is the region's job.

### 4. Decision / state map

- Nodes are states or decisions, edges are transitions.
- Edge labels = the condition or action that drives the transition.
- Use warning accent (`#e07b91`) only for terminal failure states.

---

## Mutating an existing canvas without ruining it

When the user asks you to add or change something, you are entering an existing composition. Respect it.

1. **Read the snapshot first** (`GET /api/world`) and identify the existing palette and grid. Don't introduce a fourth colour or off-grid coordinates.
2. **New nodes inherit the local cluster's accent and width.** If you're adding a node to "Column Gates", it gets the same width and accent as its neighbours.
3. **If you have to move things to make room, move them on the 8 px grid.** Don't shave 7 px off a region to squeeze a node in.
4. **Resolving an annotation is also a composition act.** If the user wrote "make these warmer", apply the warm accent (`#f3b562` or `#e07b91`) — don't repaint the cluster a random new colour.

---

## What "looks like AI slop" actually means

For reference, the visual fingerprints of unconstrained AI-generated diagrams:

- Every entity has a unique vivid colour, like a stock-photo of pushpins on a corkboard.
- Heavy gradients on cards, drop shadows, glassmorphism — none of which the renderer supports anyway, but agents sometimes fake them via emoji or unicode chrome.
- Titles like "🚀 SuperFast™ Service Layer" with marketing flourishes.
- 12 tiny nodes scattered without alignment, each labeled with a full sentence.
- Edge labels that describe the relationship in narrator voice: "This service then sends the request to the database, which returns the data."
- A "key" or "legend" region nobody asked for, explaining colours that didn't need to be different in the first place.

If you catch yourself producing any of the above, stop, delete, restart with the slop-detection checklist.
