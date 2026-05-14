# Open questions

Unresolved annotations from the live-render canvas. Each item lists the entities
it touches so the relevant owners can pick it up.

## Pricing ownership

- **Status:** open
- **Captured:** 2025-05-14 (canvas annotation)
- **Touches:** [Billing Service](../components/billing-service.md),
  [Orders Service](../components/orders-service.md)

> We agreed at standup that the billing service should not own pricing — move
> pricing-related endpoints to orders next sprint.

**Next step:** Orders team to scope the endpoint migration; Billing team to
identify which routes need to move and any shared models.

## Warehouse retention

- **Status:** open
- **Captured:** 2025-05-14 (canvas annotation)
- **Touches:** [Orders Warehouse](../components/orders-warehouse.md)

> Warehouse retention is 90 days — flag this in the deck so legal can sign off.

**Next step:** Surface the 90-day retention policy in the next architecture
review deck; loop in legal for sign-off before GA.
