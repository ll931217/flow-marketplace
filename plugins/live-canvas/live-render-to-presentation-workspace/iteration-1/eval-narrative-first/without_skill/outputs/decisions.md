# Narrative Arc — Order Fulfilment Platform

## Source canvas inventory

Pulled from `.claude/live-render-workspace/world.json`:

- **2 regions**: `Platform services` (blue, owned by platform team) and `Data plane` (green, owned by data team).
- **6 nodes**:
  - Platform: `Auth Service`, `Billing Service`, `Orders Service`
  - Data: `User DB`, `Ledger Bus`, `Orders Warehouse`
- **4 edges**:
  - `Auth -> User DB` (SQL, data)
  - `Billing -> Ledger Bus` (event, async)
  - `Orders -> Billing` (HTTP, sync)
  - `Orders -> Orders Warehouse` (SQL, data)
- **2 unresolved annotations**:
  - Pricing ownership: billing should not own pricing; move endpoints to orders next sprint. Encloses `Billing` + `Orders`.
  - Retention: warehouse retention is 90 days — needs legal sign-off. Encloses `Orders Warehouse`.

The annotations are the load-bearing signal — these are the open decisions that justify the deck existing at all. The narrative is built around them, not around the diagram for its own sake.

## Narrative arc (the "why" before the slide list)

Three-act shape:

1. **Act 1 — The system today.** Establish the two-team boundary (Platform vs. Data plane) and walk the happy path of an order. Audience leaves with a shared mental model of who owns what and how an order flows.
2. **Act 2 — The cracks.** Surface the two annotations as the real reason we're meeting. These are not diagram trivia; they're an ownership boundary violation (pricing in billing) and a compliance gap (90-day retention). Each gets its own slide so it can be discussed in isolation.
3. **Act 3 — What we're asking for.** Convert the annotations into asks: an engineering decision (move pricing endpoints next sprint) and a legal sign-off (retention policy). End with explicit owners and a next step.

This arc respects the canvas: regions become the orientation, nodes/edges become the system walkthrough, annotations become the climax. Nothing on the canvas is dropped, and nothing extra is invented.

## Proposed slide list (8 slides)

1. **Title** — "Order Fulfilment Platform — Architecture Review". Subtitle names the two open decisions.
2. **The two teams** — side-by-side regions. Platform team owns three services; Data team owns the shared infra. Sets the ownership frame.
3. **Platform services** — zoom on the Platform region. Auth, Billing, Orders with one-line descriptions.
4. **Data plane** — zoom on the Data region. User DB, Ledger Bus, Orders Warehouse with one-line descriptions.
5. **How an order flows** — the diagram with the four edges highlighted. Narrates: Orders calls Billing over HTTP; Billing emits to the Ledger Bus; Orders writes to the warehouse; Auth reads from User DB. This is the "happy path" slide.
6. **Open decision #1 — Pricing ownership** (from `annotation_naming`). Frames the boundary violation: pricing endpoints live in Billing but the standup agreed they belong in Orders. Ask: approve the move next sprint.
7. **Open decision #2 — Warehouse retention** (from `annotation_warehouse`). 90-day retention on `Orders Warehouse`. Ask: legal sign-off before the next review.
8. **Next steps** — explicit owners and dates for the two asks. Closes the loop.

## What I'm deliberately NOT doing

- Not inventing services, metrics, or SLAs that aren't on the canvas.
- Not collapsing the two annotations into one "open issues" slide — they have different audiences (eng vs. legal) and deserve separate framing.
- Not adding a "future state" slide; the canvas doesn't describe one, and speculating dilutes the asks.
- Not reordering the system walk (regions -> services -> flow) — that's the order a new viewer needs.

## Approval

Headless eval — no human reviewer available. Proceeding AS IF approved per harness instructions.
