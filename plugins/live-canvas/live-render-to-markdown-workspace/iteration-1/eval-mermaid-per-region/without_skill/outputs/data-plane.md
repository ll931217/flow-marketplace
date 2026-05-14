# Data plane

> Shared infrastructure. Owned by the data team.

[← Back to index](./index.md)

## Components

| Component | Kind |
| --- | --- |
| User DB | Database |
| Ledger Bus | Bus |
| Orders Warehouse | Database |

## Diagram

```mermaid
flowchart LR
  subgraph DATA["Data plane"]
    db_users[("User DB")]
    bus_ledger{{"Ledger Bus"}}
    warehouse_orders[("Orders Warehouse")]
  end

  %% Upstream producers (live in Platform services)
  svc_auth["🔐 Auth Service<br/><i>platform</i>"]:::external
  svc_billing["💳 Billing Service<br/><i>platform</i>"]:::external
  svc_orders["📦 Orders Service<br/><i>platform</i>"]:::external

  svc_auth -- "SQL" --> db_users
  svc_billing -- "event" --> bus_ledger
  svc_orders -- "SQL" --> warehouse_orders

  classDef external stroke-dasharray: 4 3,opacity:0.7;
```

## Edges (incoming)

- **Auth Service → User DB** — `SQL` (data).
- **Billing Service → Ledger Bus** — `event` (async).
- **Orders Service → Orders Warehouse** — `SQL` (data).

## Annotations

The following annotation on the canvas is anchored to an entity in this region (`warehouse_orders`):

> Warehouse retention is 90 days — flag this in the deck so legal can sign off.
>
> — _unresolved, created 2025-05-14_
