# Order Fulfilment Platform — Docs

This directory documents the Order Fulfilment Platform, generated from the
live-render workspace canvas. It is plain markdown with Mermaid fenced blocks —
GitHub, GitLab, and most static-site generators render the diagrams natively, no
build step required.

## Layout

- [`architecture.md`](./architecture.md) — system overview with a Mermaid graph
  of every service, datastore, and bus.
- [`regions/`](./regions/) — one page per ownership region (Platform, Data).
- [`components/`](./components/) — one page per service, database, or bus.
- [`decisions/`](./decisions/) — open questions and annotations captured on the
  canvas that have not yet been resolved.

## Quick map

| Region | Components |
| --- | --- |
| [Platform services](./regions/platform-services.md) | [Auth](./components/auth-service.md), [Billing](./components/billing-service.md), [Orders](./components/orders-service.md) |
| [Data plane](./regions/data-plane.md) | [User DB](./components/user-db.md), [Ledger Bus](./components/ledger-bus.md), [Orders Warehouse](./components/orders-warehouse.md) |

## Open questions

See [`decisions/open-questions.md`](./decisions/open-questions.md) for unresolved
annotations from the canvas (pricing ownership, warehouse retention).
