# Speaker notes — Order Fulfilment Platform architecture review

Open `deck.html` in a browser. Use ←/→ to navigate, F for fullscreen.

---

## Slide 1 — Title
"Quick architecture walkthrough of the Order Fulfilment Platform. Two regions, six components, and a couple of open decisions I want your input on before sprint planning."

## Slide 2 — Agenda
Quickly preview the five beats. Keep it under 30 seconds.

## Slide 3 — Domains
- **Platform team** owns Auth, Billing, Orders. Independently deployed, talk over HTTP and the ledger bus.
- **Data team** owns the shared infra: User DB, Ledger Bus, Orders Warehouse.
- Call out the clean ownership split — no service crosses into a store it doesn't own.

## Slide 4 — Component diagram
Walk left-to-right:
- Orders calls Billing over HTTP (the only sync inter-service hop).
- Billing emits events to the Ledger Bus (async, dashed line).
- Auth writes to User DB; Orders writes to the Warehouse (both SQL).
- Note the legend: solid grey = sync, dashed amber = async, green = data.

## Slide 5 — Communication
Four edges total. The key observation: every cross-region path is either async (bus) or a service writing to a store it owns. No "spooky action" reads across boundaries.

## Slide 6 — Open decisions (the meat of the meeting)
1. **Pricing move (Billing → Orders).** Already agreed at standup. Just need to confirm scope this week and slot for next sprint.
2. **Warehouse 90-day retention.** Needs legal sign-off. Risk: any analytics past 90 days fails silently. Need an owner to take this to legal.

## Slide 7 — Asks
- Confirm pricing move.
- Owner for the legal conversation.
- Anything missing on the canvas?
- Schedule the scope-sizing follow-up.

---

## Backup Q&A

- **"Why is Billing the only one on the bus?"** It's the only producer today. Orders will likely follow once the pricing move lands — it'll start emitting price-change events.
- **"Why HTTP between Orders and Billing instead of async?"** It's a read-path call (price quote at checkout). Latency-sensitive, so we kept it sync. Worth revisiting if we see retry storms.
- **"Can we extend warehouse retention?"** Cost vs. compliance trade. That's exactly the legal conversation.
