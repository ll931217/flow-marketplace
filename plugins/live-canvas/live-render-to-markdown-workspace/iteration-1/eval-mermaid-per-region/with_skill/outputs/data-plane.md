# Data plane

Shared infrastructure. Owned by the data team.

## Wiring

```mermaid
flowchart LR
  db_users[("User DB")]
  bus_ledger[("Ledger Bus")]
  warehouse_orders[("Orders Warehouse")]
  svc_auth["Auth Service (other region)"]:::external
  svc_billing["Billing Service (other region)"]:::external
  svc_orders["Orders Service (other region)"]:::external

  svc_auth -- "SQL" --> db_users
  svc_billing -- "event" --> bus_ledger
  svc_orders -- "SQL" --> warehouse_orders

  click svc_auth "./platform-services.md#svc_auth" "Open Platform services"
  click svc_billing "./platform-services.md#svc_billing" "Open Platform services"
  click svc_orders "./platform-services.md#svc_orders" "Open Platform services"

  classDef external stroke-dasharray: 4 4, color: #8a8f9a

  style db_users fill:#0c0d10,stroke:#34d399,color:#f0f0f0
  style bus_ledger fill:#0c0d10,stroke:#34d399,color:#f0f0f0
  style warehouse_orders fill:#0c0d10,stroke:#34d399,color:#f0f0f0
```

## Entities

| ID | Title | Kind | Accent |
| --- | --- | --- | --- |
| <a id="db_users"></a>`db_users` | User DB | Database | `#34d399` |
| <a id="bus_ledger"></a>`bus_ledger` | Ledger Bus | Bus | `#34d399` |
| <a id="warehouse_orders"></a>`warehouse_orders` | Orders Warehouse | Database | `#34d399` |

## Annotations

> **User annotation** — _2026-05-13_
>
> "Warehouse retention is 90 days — flag this in the deck so legal can sign off."
>
> Touches: [`warehouse_orders`](#warehouse_orders)
>
> Status: unresolved

---

← [Back to index](./index.md)
