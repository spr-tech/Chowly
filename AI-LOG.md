# AI-LOG

Record of AI-assisted work on Chowly: what was asked, what was built, what was rejected or corrected.

## Schema

Asked: draft the Prisma schema for the nine agreed models, show it before pushing. Four open
decisions were raised and resolved first:

- Order statuses: `PLACED → PREPARING → SERVED → PAID` (chosen over a two-state PLACED/SERVED/PAID
  flow, so prep can be timestamped and the delay/complaint story has something concrete to point at).
- Cart: React state only, no draft-order persistence (matches "browse then place one order," no
  auth to reattach a cart to anyway).
- Table selection: QR-style `/t/[number]` route (matches real dine-in ordering; table's Int id
  stays out of the URL, only the seeded `number` is public).
- Wait-time formula (customer's own version, adopted as given):
  `estimatedWaitMinutes = max(prepTimeMinutes across items in the order) + 3 × (unpaid orders placed before this one)`.
  Stored on `Order` as a snapshot at placement, not recomputed later, so a customer's receipt
  always matches the number they were quoted.

Built: `prisma/schema.prisma` with the nine models, three named `Staff` relations on `Order`
(waiter/chef/bartender), `cuid()` ids on user-created rows and autoincrement Int ids on seeded
rows, kobo integers for money, `nameSnapshot`/`unitPriceKobo` on `OrderItem`.

Decision: `DiningTable` has no stored "occupied" boolean. Occupancy is derived — a table is free
iff none of its orders have `status != PAID` — checked via an indexed query (`@@index([tableId,
status])`) in the server action on submit, so it can't drift from the order's real status.

Correction (self-caught before running against the DB): `datasource.url` in `schema.prisma` is
removed in Prisma 7 — validated with `npx prisma validate` and hit `P1012`. Connection config now
lives only in `prisma7.config.ts`, and `PrismaClient` needs a driver adapter passed to its
constructor. Flagged to the user as a phase-2 concern before it was written anywhere.

Rejected: none — schema approved as drafted, migration `20260906170038_init` applied.

## Seed

Asked: idempotent seed for The Juniper Room (restaurant id 1), ~8 food + ~6 drinks with varied
prep times, 8 staff (3 waiter / 3 chef / 2 bartender), 12 tables. Import from the generated client
path, not `@prisma/client`. Run it, confirm row counts, commit — then stop before phase 1.

Found: the generated client (`app/generated/prisma/client.ts`) has no default export path other
than `client.ts` itself (no `index.ts`), and its own doc comment confirms Prisma 7 requires a
driver adapter — `new PrismaPg({ connectionString: ... })` — passed into `PrismaClient`.
`@prisma/adapter-pg` wasn't installed. Installed it pinned to `7.10.0`, matching the installed
`prisma`/`@prisma/client` version exactly (mirrors the existing "always pin to 7" rule).

Built: `prisma/seed.ts`. `Restaurant` is a real `upsert` (fixed id 1). `MenuItem` and `Staff` have
no unique constraint on `name`, so they use find-by-name-then-create-or-update instead of upsert.
`DiningTable` has `@@unique([restaurantId, number])`, so it upserts directly. Ran it twice against
Neon to confirm no duplicates; verified counts by query: 8 food, 6 drinks, 3 waiters, 3 chefs,
2 bartenders, tables 1–12.

Note (not acted on): `npm audit` flags 4 high-severity issues, all transitive dev-tooling deps of
`@prisma/config` (`deepmerge-ts`, `mysql2` — the latter irrelevant, we're Postgres-only). The only
fix path downgrades to `prisma@6.19.3`, which conflicts with the standing "never go below 7" rule,
so left as-is.

Rejected: none.

## Phase 1: shared lib

Asked: `lib/prisma.ts`, `lib/money.ts`, `lib/wait-time.ts`, `lib/role.ts`. Before writing
`lib/prisma.ts`, asked me to justify `@prisma/adapter-pg` vs `@prisma/adapter-neon` for the Vercel
runtime — Node vs Edge, pooled TCP vs serverless driver — rather than assume.

Answered: staying with `@prisma/adapter-pg`. Server Actions run on Vercel's Node.js runtime by
default, not Edge, so there's no need for `adapter-neon`'s WebSocket/HTTP transport (which exists
specifically so Prisma can run somewhere raw TCP sockets aren't available, e.g. Edge/workerd).
`DATABASE_URL` is already Neon's pooled endpoint, which is exactly what `adapter-pg`'s client-side
`pg.Pool` is meant to sit in front of for a fleet of short-lived serverless invocations. Verified
before answering: `@prisma/adapter-neon` isn't installed, and the generated client's own
`internal/class.ts` confirmed Prisma 7 compiles queries to WASM (not the old Rust binary engine) —
so the constraint really is about the DB transport, not the query engine.

Built:
- `lib/prisma.ts` — singleton `PrismaClient` with `PrismaPg`, pool `max: 5`, cached on
  `globalThis` (guards against Next dev's hot-reload re-creating the pool on every save).
- `lib/money.ts` — `formatNaira(kobo)`, e.g. `750000 → "₦7,500"`.
- `lib/wait-time.ts` — `calculateEstimatedWaitMinutes(items, unpaidOrdersAheadCount)` implementing
  the agreed formula as a pure function (no Prisma import) — the caller (a later server action)
  is responsible for counting unpaid orders ahead, restaurant-wide.
- `lib/role.ts` — `ViewerRole` type, cookie name constant, `isViewerRole` guard. No enforcement
  logic: there's no auth session to check against, so the header toggle is presentation only, per
  the "no auth" constraint.

Verified: `npx tsc --noEmit` clean; manually ran `formatNaira` and `calculateEstimatedWaitMinutes`
against real seed numbers before committing.

Rejected: none.
