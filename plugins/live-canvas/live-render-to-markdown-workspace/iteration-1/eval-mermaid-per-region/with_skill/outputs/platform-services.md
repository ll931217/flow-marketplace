# Platform services

User-facing services owned by the platform team. All three are deployed
independently and talk over HTTP + the ledger bus.

## Wiring

```mermaid
flowchart LR
  svc_auth["Auth Service"]
  svc_billing["Billing Service"]
  svc_orders["Orders Service"]
  db_users["User DB (other region)"]:::external
  bus_ledger["Ledger Bus (other region)"]:::external
  warehouse_orders["Orders Warehouse (other region)"]:::external

  svc_orders -- "HTTP" --> svc_billing
  svc_auth -- "SQL" --> db_users
  svc_billing -- "event" --> bus_ledger
  svc_orders -- "SQL" --> warehouse_orders

  click db_users "./data-plane.md#db_users" "Open Data plane"
  click bus_ledger "./data-plane.md#bus_ledger" "Open Data plane"
  click warehouse_orders "./data-plane.md#warehouse_orders" "Open Data plane"

  classDef external stroke-dasharray: 4 4, color: #8a8f9a

  style svc_auth fill:#0c0d10,stroke:#60a5fa,color:#f0f0f0
  style svc_billing fill:#0c0d10,stroke:#60a5fa,color:#f0f0f0
  style svc_orders fill:#0c0d10,stroke:#60a5fa,color:#f0f0f0
```

## Entities

| ID | Title | Kind | Accent |
| --- | --- | --- | --- |
| <a id="svc_auth"></a>`svc_auth` | 🔐 Auth Service | Component | `#60a5fa` |
| <a id="svc_billing"></a>`svc_billing` | 💳 Billing Service | Component | `#60a5fa` |
| <a id="svc_orders"></a>`svc_orders` | 📦 Orders Service | Component | `#60a5fa` |

## Annotations

> **User annotation** — _2026-05-13_
>
> "We agreed at standup that the billing service should not own pricing — move pricing-related endpoints to orders next sprint."
>
> Touches: [`svc_billing`](#svc_billing), [`svc_orders`](#svc_orders)
>
> Status: unresolved

---

← [Back to index](./index.md)
