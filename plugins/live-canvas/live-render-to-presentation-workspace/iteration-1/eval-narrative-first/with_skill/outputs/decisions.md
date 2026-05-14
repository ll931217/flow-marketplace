# Decisions — Narrative-First Outline

Headless run: no human approver available. Per harness instructions, the
proposed outline is recorded here and treated as approved before scaffolding.

## World snapshot at a glance

- **Title:** `Order Fulfilment Platform`
- **Regions (2):**
  - `region_platform` — "Platform services" (blue accent). Description: "User-facing services owned by the platform team. All three are deployed independently and talk over HTTP + the ledger bus."
  - `region_data` — "Data plane" (green accent). Description: "Shared infrastructure. Owned by the data team."
- **Nodes (6):**
  - In `region_platform`: Auth Service, Billing Service, Orders Service (all `kind: Component`).
  - In `region_data`: User DB, Ledger Bus, Orders Warehouse (`kind: Database` / `Bus`).
  - Spatial membership confirmed by bounding-box centre check — no orphan nodes.
- **Edges (4):**
  - `auth → user-db` (SQL, data)
  - `billing → ledger-bus` (event, async)
  - `orders → billing` (HTTP, sync)
  - `orders → warehouse` (SQL, data)
- **Annotations (2, both unresolved):**
  - `annotation_naming` — "We agreed at standup that the billing service should not own pricing — move pricing-related endpoints to orders next sprint." Encloses `svc_billing`, `svc_orders`.
  - `annotation_warehouse` — "Warehouse retention is 90 days — flag this in the deck so legal can sign off." Encloses `warehouse_orders`.

## Narrative arc

The canvas tells a clear two-act story: **what the platform is** (regions
+ nodes + edges) and **what is still in flight** (the two unresolved
annotations). Those annotations are the conflict — a presentation that
buries them at the end will fail the user's real intent ("flag this in
the deck so legal can sign off"). They should land before Q&A while the
audience is still warm.

Region-per-slide is the spatial author's grouping, so we preserve it,
but we add a single "wiring" slide between the two regions because the
edges cross the region boundary and are the most interesting part of the
architecture.

## Proposed deck (8 slides)

```
00 Title          — "Order Fulfilment Platform" + briefing date
01 Today          — scoreboard: 2 regions / 6 services / 4 edges / 2 open annotations
02 Platform       — region_platform: 3 services as cards, accent blue, quote region description
03 Data plane     — region_data: 3 nodes as cards, accent green, quote region description
04 Wiring         — the 4 edges drawn as a mono call-graph card (HTTP / SQL / event)
05 Pricing move   — annotation_naming as USER ANNOTATION callout, touches billing + orders
06 Retention      — annotation_warehouse as USER ANNOTATION callout, touches warehouse
07 Next steps     — consolidate the two open annotations into a short action list + Q&A placeholder
```

## Why this shape

- **Slide 01 (Today) before slide 02 (Platform):** sets the scoreboard so
  the audience knows the scope before being walked through the
  architecture.
- **Slide 04 (Wiring) between the two regions:** edges in the world cross
  the region boundary (orders→billing within platform, billing→ledger and
  orders→warehouse from platform to data). A dedicated wiring slide is
  the natural seam between the two regions.
- **Slides 05 + 06 split rather than merged:** each annotation has a
  distinct owner (engineering decision vs. legal sign-off). Merging would
  blur the call-to-action.
- **Slide 07 (Next steps) instead of a Q&A placeholder alone:** the user
  asked to "flag this in the deck so legal can sign off" — an explicit
  action list slide honours that. Q&A is appended as a closing line, not
  its own slide, to keep the deck tight at 8.

## What we deliberately did NOT do

- Did not bolt on an "Open issues" auto-generated slide; the two
  annotations get full real-estate at 05/06.
- Did not invent any prose. Region descriptions and annotation text are
  quoted verbatim from the world.
- Did not introduce subsections; every slide fits on a single 1100px
  stage given the small entity count.

## Approval

Treated as approved (headless eval). Proceeding to Phase 3 scaffold + Phase 4 hand-authoring against this 8-slide outline.
