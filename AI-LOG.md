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

## Correction: wait-time queue term was mis-scoped

Corrected by the user: the second parameter of `calculateEstimatedWaitMinutes` was named
`unpaidOrdersAheadCount`, but the rule is "orders still ahead in the kitchen/bar" — a SERVED order
is unpaid but has already left the kitchen, so it shouldn't inflate anyone else's estimate.
Renamed to `activeOrdersAheadCount` and rewrote the doc comment to spell out that "active" means
`status IN (PLACED, PREPARING)`, not `status != PAID`. No query existed yet to fix (that lands
with the order-placement server action in a later phase) — the comment is the guardrail for
writing it correctly then.

## Deadline pass: schema + phases 2-4 in one continuous build

Asked, under a hard deadline: build phases 2-4 in one pass, no stopping between them, no review
gate — just build and report when a customer can go menu-to-paid without an error. Scope cuts
given: drop `PREPARING` entirely (`PLACED -> SERVED -> PAID` only), no `/t/[number]` route (landing
page dropdown only), minimal Tailwind styling. Two corrections carried in: the wait-time queue
count must filter `status = PLACED` (not `!= PAID`), and `lib/role.ts` needed an actual header
toggle, not just the type.

Schema: dropped `PREPARING` from `OrderStatus`. `prisma migrate dev` couldn't run non-interactively
in this shell (it needs a TTY to confirm the enum-value-removal warning), so used
`--create-only`... which then hit intermittent `P1001`s reaching Neon (cold-start latency on the
pooled endpoint — confirmed by a raw `pg` connection succeeding seconds apart from a failing
Prisma one, and by direct TCP tests). Rather than fight shadow-database flakiness, hand-wrote the
migration SQL directly (rename type, recreate without PREPARING, recast the column, drop the old
type) and applied it with `migrate deploy`, which only needs one connection. Safe: no `Order` rows
existed yet.

Before writing any App Router code: read `node_modules/next/dist/docs/` per AGENTS.md, since this
project is Next 16 and several APIs differ from training data — confirmed `cookies()`/`params` are
async, the `PageProps<'route'>` / `LayoutProps<'route'>` global helpers (already used in the
existing `layout.tsx`), and that `cacheComponents` (which would force Suspense boundaries around
dynamic data) is off by default here. Ran `npx next typegen` before type-checking so
`PageProps<'/orders/[id]'>` would resolve.

Built:
- `app/actions/orders.ts` — `placeOrder` (Serializable transaction: re-checks table occupancy
  server-side, counts PLACED orders for the queue term, creates Customer + Order + OrderItems,
  redirects to the order's cuid URL), `assignStaffAndServe` (waiter/chef/bartender assignment and
  PLACED->SERVED happen together — no auth, so there's no session to infer an "acting waiter" from
  otherwise), `payOrder` (SERVED-only guard, Payment + status->PAID in one transaction — this is
  what frees the table, since occupancy is derived), `fileComplaint`/`submitRating` (upsert on the
  1:1 orderId).
- `app/actions/role.ts` — `setViewerRole` sets the cookie and redirects to `/` or `/staff`.
- `components/RoleToggle.tsx` — the actual header toggle (was missing after the lib phase).
- `components/CustomerOrderFlow.tsx` — single-page flow: name, table dropdown (occupied tables
  disabled), two-section menu with quantity steppers, live cart total, Place Order.
- `components/StaffOrderActions.tsx` / `CustomerOrderActions.tsx` — role-specific action panels.
- `app/page.tsx`, `app/staff/page.tsx`, `app/orders/[id]/page.tsx` — `/orders/[id]` is shared by
  both roles and branches purely on the role cookie (no auth, so this is presentation-only, not a
  security boundary, matching `lib/role.ts`'s original design note).

Verified: `tsc --noEmit` clean throughout. Full end-to-end pass with a scripted Playwright run
against the system-installed Chrome (via `channel: "chrome"`, avoiding a slow Chromium download) —
menu -> cart -> place order -> staff assigns chef/waiter/bartender and marks served -> customer
sees the SERVED-only pay button -> pays -> receipt shows "SIMULATED PAYMENT — not a real
transaction" verbatim -> table becomes selectable again. Zero browser console errors. Confirmed
the wait-time math against seed data (Efo Riro 30 min + Zobo 3 min -> max(30,3) + 3x0 = 30) and the
₦ totals.

Rejected: none.

## Deploy prep

Asked: dashboard steps, which env vars, check the build, how to seed production. Ran `npm run
build` before answering anything, rather than guessing:

- `app/generated/prisma` is gitignored (Prisma writes it from the schema on demand), so a clean
  Vercel checkout has no client until something generates one — confirmed by deleting it and
  watching `next build` fail with "Module not found: Can't resolve '@/app/generated/prisma/client'".
  Fixed with a `postinstall: "prisma generate"` script (Prisma's own recommended pattern for
  Vercel), verified by deleting the client and re-running `npm install`.
- Confirmed empirically, not assumed: `prisma generate` needs zero env vars (no DB connection at
  all), the build succeeds even with a completely invalid `DATABASE_URL` (every route reads
  `cookies()` so all four resolve to `ƒ (Dynamic)`, no DB access at build time), but the build
  *fails* if `DATABASE_URL` is unset entirely — `lib/prisma.ts` constructs the client at module
  scope, and Next's page-data-collection step imports every route during build. So: `DATABASE_URL`
  must exist as a non-empty string at build time; `DIRECT_URL` isn't needed on Vercel at all (only
  `prisma migrate`, run manually from a laptop, reads it).
- Found and deleted a leftover row from my own earlier end-to-end test ("Test Customer E2E") in
  the same Neon DB that's about to go live — asked the user first, since it's a database mutation,
  not a local file.

## Correction: role switch and refresh were destroying an unsubmitted order

The user asked for an explanation first, no fix, then asked for the fix separately. The cause:
cart/name/table lived only in `CustomerOrderFlow`'s `useState`, and the placed order's cuid only
ever touched the URL bar — a role-switch `redirect()` (or a closed tab) discarded all of it, with
nothing in the data model or cookies to reconnect a returning customer to their own order.

Fixed in two commits, in the requested priority order:

1. **Order continuity.** `placeOrder` had to stop calling `redirect()` itself — a server-side
   redirect is a thrown control-flow exception that never lets the calling client code see a normal
   return value, so there was no point after `await placeOrder(...)` where client code could ever
   run to write `localStorage`. It now returns `{ orderId }`, and `CustomerOrderFlow` writes
   `chowly_active_order` before calling `router.push()` itself. `ActiveOrderBanner` (new client
   component — the server can't read `localStorage`) shows a "View your current order" link on the
   landing page when that key is set; `CustomerOrderActions` clears it once `payOrder` succeeds.
2. **Cart persistence.** `CustomerOrderFlow` mirrors `customerName`/`tableId`/`cart` to three
   `localStorage` keys, restored in a `useEffect` on mount (never during render — the server and
   React's first client render must match, or hydration throws). A `hasHydratedDraft` flag stops
   the mirror effect from firing before the restore effect's `useEffect` has actually run — without
   it, the mirror effect's first pass would write back the still-blank initial state and clobber
   the very draft being restored, correcting itself a render later but for no good reason. Only the
   cart clears on successful placement; name and table are kept for a possible next order.

Verified with a second scripted Playwright pass, reusing the user's already-running dev server on
port 3000 rather than starting a competing one (Next 16's dev lockfile refuses a second instance
per project; Playwright's browser context is isolated from whatever the user has open, so sharing
the server is safe): built a cart, switched Staff -> Customer, confirmed name/table/cart came back
unchanged, confirmed a hard reload also survives, placed the order, confirmed the cart-only clear,
returned to "/" and confirmed the banner linked to the exact right order id. Also noticed (and left
untouched) a real in-progress order the user had placed themselves on their own dev server during
this — cleaned up only the row my own script created, matched by its distinctive test name.

## Styling pass

Asked: fix the dark-mode blocker, apply a named 8-color palette as Tailwind v4 `@theme` variables,
serif headings/sans body, card treatment, terracotta reserved for primary actions only, status as a
coloured pill, a loud (never muted) simulated-payment label, mobile-first breathing room and tap
targets, "The Juniper Room" header + toggle + small muted footer. No logic or schema changes.

Built: removed the create-next-app `prefers-color-scheme: dark` block and added `color-scheme:
light` on `:root` so browser chrome (form controls, scrollbars) can't quietly go dark either. The
eight named colors live as plain `:root` custom properties, then get mapped into `@theme inline`
(matching the existing pattern already in the file for the Geist font variables) so they're usable
as ordinary Tailwind utilities — `bg-cream`, `text-ink`, `border-line`, etc. — rather than only
reachable via arbitrary-value syntax. Added `Lora` via `next/font/google` for `font-serif`
(headings only); dropped `Geist_Mono`, which was loaded but never referenced by any `font-mono`
utility anywhere in the app.

Interpreted "terracotta: primary buttons only, nothing else terracotta" literally and audited every
use: Place Order / Mark Served / Pretend to Pay are the only terracotta-filled buttons (one per
screen, matching what each screen is actually for). Error text, the "view your current order" link,
and the secondary Complaint/Rating buttons deliberately do NOT use terracotta (ink text, outlined
ink buttons instead) even though it would have been visually easy to reach for it there too.

Added `components/StatusBadge.tsx` (new shared component — PLACED -> saffron pill, SERVED/PAID ->
green pill) rather than duplicate the color-mapping logic in both the staff list and the order
detail page. The simulated-payment panel uses a bordered saffron block specifically so it can't be
mistaken for muted/secondary content, per "never muted."

Verified: `tsc --noEmit` clean, `npm run build` succeeds (including fetching Lora at build time, a
genuine network dependency worth knowing about), and a scripted Playwright pass at both a 390px
mobile viewport and a 1024px desktop viewport against the real seeded menu and the user's own real
in-progress order — zero console errors, all four card types and the status pill render correctly
in both roles.

Flagged, not fixed (logic, not styling, so out of scope for this pass): `npx eslint .` reports
`react-hooks/set-state-in-effect` on the two localStorage-restore effects added in the previous
turn (`CustomerOrderFlow`, `ActiveOrderBanner`). Confirmed via `git stash` that this predates this
commit entirely — it's a leftover from the order-continuity work, not introduced here.

## Landing page hero

Asked: add a two-column editorial hero above the existing menu — eyebrow pill, big serif headline
("Good food." ink / "No fuss." terracotta) with a hand-drawn underline stroke, the existing
name+table form relocated into the hero's card, a "Start ordering" link that scrolls to the menu
without navigating or submitting anything, and a five-blob CSS illustration. No routes, actions, or
schema — the menu/cart/Place Order flow had to stay exactly where it functionally was.

Built `components/HeroIllustration.tsx` (new, stateless, `aria-hidden`) and restructured
`CustomerOrderFlow.tsx`'s JSX only — none of its state, effects, or `handleSubmit` logic changed;
the name/table form fields kept their exact ids, so the draft-persistence effects from two turns
ago still target the same inputs. "Start ordering" is a plain `<a href="#menu">`, deliberately not
`next/link`'s `<Link>` and not a `<button>` — a bare anchor can never submit a form regardless of
nesting, and a same-document hash href never enters Next's router at all, so "doesn't navigate" and
"doesn't submit" were both satisfied by the choice of tag rather than by extra guard logic. Added
`scroll-behavior: smooth` to `<html>` in globals.css for the actual animation (confirmed this is
unrelated to Next 16's `data-scroll-behavior` opt-in mentioned in its docs, which only governs
route-transition scroll resets, not in-page anchors).

First pass at the five concentric blobs read too close to a "loading spinner" — the exact trap
called out in the brief. Fixed by pushing the border-radius corner spread and per-layer rotation
much further apart than the initial values; also stepped the five sizes down unevenly
(100/76/57/41/27%) so the innermost terracotta blob reads as the largest *solid* mass despite being
the smallest individual layer.

Verified: `tsc --noEmit` clean. Scripted Playwright pass at 390px (the specified overflow-check
width) and 1280px — zero horizontal overflow at either, confirmed via `document.documentElement.
scrollWidth` vs `clientWidth` rather than eyeballing a screenshot. Hit one real bug in the test
script itself, not the app: `element.getAttribute("disabled")` returns `""` for a genuinely
disabled option, and `!""` is `true` in JS, so the "pick a free table" loop was silently treating
occupied tables as available — fixed the check to compare against `null` instead of relying on
truthiness, then reran and got a clean pass including a full order placement through the
restructured hero form.

Also noticed, unprompted: the editor had already auto-fixed the `react-hooks/set-state-in-effect`
error in this file's draft-restore effect (visible as a disk change between my read and my next
edit) — took it as the current state per instructions rather than reverting it, since it changes
nothing observable and resolves a lint error flagged two turns ago as out-of-scope-for-now.
`ActiveOrderBanner.tsx` still has the identical unfixed error.

Cleanup note: test runs against the shared Neon DB left behind two "Hero Test" orders under
*separate* Customer rows (the app creates a fresh ad-hoc Customer per order by design, so the same
name can legitimately belong to more than one row) — a `findFirst`-based cleanup caught only one of
them; switched to `findMany` to catch both. Left two real orders the user placed on their own dev
server during this session ("ade", "jay") completely untouched.

## Data cleanup

Asked directly: delete the "ade" (table 8) and "jay" (table 3) orders and their customers — the
user's own testing, not seed data. Deleted both; left the seeded Restaurant/MenuItem/Staff/
DiningTable rows untouched, confirmed by row count afterward (1/14/8/12).

## Split the menu onto its own route

Asked: pull the menu, cart, and Place Order off `/` entirely onto a new `/menu` route. `/` becomes
hero-only, with "Start ordering" turning into a real button (validate both fields, write the
session to localStorage, `router.push("/menu")`) instead of the in-page anchor scroll from the
previous task. Two-route ceiling given as a guardrail against scope creep (explicitly: no `/pay`,
no `/rate`) — only needed the one.

Split `CustomerOrderFlow.tsx` into `LandingHero.tsx` (hero + form, on `/`) and `MenuOrderFlow.tsx`
(everything menu-related, on the new `/menu`). The session (name, tableId, tableNumber) crosses the
route boundary purely through three new `localStorage` keys in `lib/storage.ts` — there is still no
server-side session of any kind, consistent with the app's no-auth design throughout. `/menu`'s
Server Component fetches only `menuItems`, matching the instruction to read "exactly as / does
today" — so the table *number* (not just its id) gets written to storage from `/` at click time,
since `/menu` never queries `DiningTable` and has no other way to display "Table 7" in its session
bar.

The redirect-if-no-session logic is the one genuinely fiddly part: checking `!customerName ||
!tableId` before the mount effect's localStorage read has landed would redirect every valid session
too, since state starts blank on every render regardless of what's actually stored. Gated it behind
a `hasCheckedSession` flag that only flips true after the restore effect's callback runs, and wrote
that effect in the deferred-setState-in-a-setTimeout style proactively (rather than the naive
synchronous version), since that's the exact pattern an editor auto-fix already applied to the old
component's equivalent effect for `react-hooks/set-state-in-effect` — confirmed with `npx eslint .`
that doing so upfront avoided reintroducing the same error.

Rebuilt the menu view per spec: card grid (category label, serif name, description, price, prep
time, one Add button — no on-card quantity display, matching the spec's card contents literally),
Food/Drinks pill tabs, and a floating "Your order · N" button opening a bottom-sheet cart drawer
where quantity adjustment and Place Order now live (previously always inline).

Verified end-to-end with Playwright at 390px and 1280px, zero console errors, against every point
raised: name/table survive `/` -> `/menu`, a refresh of `/menu` keeps both session and cart, an
empty-localStorage visit to `/menu` bounces to `/`, a full order placement still completes, the
role toggle works from both pages (bonus: session and cart both survive that round trip too, since
neither ever gets cleared by navigating away), and `document.documentElement.scrollWidth` matches
`clientWidth` at both widths on both pages.

Noticed, flagged, not reverted: `HeroIllustration.tsx`'s blobs picked up a `hidden md:block` class
between my last read of that file and this task (not a change I made) — the illustration no longer
renders at all below the `md` breakpoint, which contradicts the earlier "~280px on mobile" spec.
Left it as the current state per instructions rather than guessing at intent and reverting it.

Cleanup: deleted the one test order ("Split Test") this task's verification created. A second
screenshot script filled the name field with "Ada" but never clicked Place Order, so it left no row
behind — checked before deleting anything under that name, since it's also the input's own
placeholder text and could plausibly collide with real data later.

## Reskin /menu against two reference screenshots

Asked to match two screenshots from an unrelated Replit-hosted reference app: one of the menu grid
(icon-badge cards, terracotta price, clock-icon prep time, compact dark "+ Add" pill, a decorated
floating cart button), and — added mid-turn as a follow-up — one of what opens when that button is
clicked (a full "Your order." page: table label, itemized list card with per-line steppers and a
trash icon, and a dark "Ready when you are." summary card with subtotal and a big Place Order
button). Told explicitly to keep our real seeded menu, naira formatting, and existing copy — only
the visual structure was reference material.

Judgment call, flagged rather than asked or silently decided: the reference's cart view lives at
its own `/cart` URL, but the previous task had explicitly capped this feature at one new route
(`/menu`) and ruled out additions like `/pay`/`/rate`. Rather than add a third route on the strength
of a screenshot's address bar, implemented the opened-cart view as a same-route full-screen swap
inside `MenuOrderFlow` (its own return branch, gated on `isCartOpen`) — visually indistinguishable
from a real page from the user's side, but doesn't touch the route budget from two turns ago.

Built six small hand-drawn inline SVG icons (fork/knife, shopping bag, clock, check, plus, trash)
local to `MenuOrderFlow.tsx`, matching the pattern `LandingHero.tsx` already set for its own
sparkle/pin icons rather than reaching for emoji or a new icon-library dependency.

Verified: `tsc --noEmit` and `npm run build` clean; `npx eslint .` shows only the same
`ActiveOrderBanner.tsx` error carried since the order-continuity work, nothing new introduced.
Playwright at 390px and 1280px on both the grid and the full-screen cart view: no horizontal
overflow either width, the trash icon actually removes a line, and a full order placement —
including removing one line first — completes end-to-end. One flaky run during testing turned out
to be the test script clicking Place Order a beat too fast after a re-render, not an app bug;
adding a short synchronous read before the click made it reproducible-clean.

Cleanup: deleted the "Reskin Test" and "Reskin Desktop" test orders this verification created.
