## Project Focus
- Project: `ticketeer`
- Source of truth for Week 1: `spec-w1.md`
- Goal: ship a Friday-ready backend API for TicketGuard with strict consistency under concurrent demand.

## Scope Lock (W1)
Build only:
- Auth: register/login/me
- Organizer-owned event CRUD + publish
- Seat class + seat inventory for draft events
- Reservation hold + confirm with race-condition safety
- Typed API contracts (Zod) and standard response envelopes
- Postgres (Docker) with Drizzle schema/migrations
- Expiration worker for stale pending holds
- Rate limiting for reservation/payment-sensitive endpoints

Do not build yet:
- Real payment gateway
- Refund execution workflow
- Admin UI/dashboard
- Notification channels (email/SMS)
- Multi-service architecture

## Locked Product Decisions
1. Payment is stub-only in W1.
2. Published event commercial/config fields are immutable (hard freeze).
3. Confirm uses strict expiry boundary: `now >= expiredAt` must fail.
4. `ADMIN` is seed-only; cannot be created via register API.
5. API naming uses plural resources.

## Roles and Access
- Roles: `USER`, `ORGANIZER`, `ADMIN`
- `USER`: create/cancel/confirm own reservations.
- `ORGANIZER`: mutate own draft events, seat classes, seats, and publish own events.
- `ADMIN`: privileged operations (seeded only in W1).
- Mutation rule: only owner organizer or admin can mutate event resources.

## State Machines
- Event: `DRAFT -> PUBLISHED`
- Reservation: `PENDING -> RESERVED | CANCELED`
- Payment (stub): `PENDING -> PAID | FAILED`

Rules:
- Event publish allowed only if:
  - event has at least one seat class
  - event has at least one seat
  - booking window valid: `closedAt == null || closedAt > openedAt`
- Reservation create sets `PENDING` and `expiredAt` (default 5 minutes)
- Confirm before expiry changes reservation to `RESERVED` and payment to `PAID` atomically
- Expired or canceled pending reservation becomes `CANCELED`
- `RESERVED` is terminal in W1

## Non-Negotiable Invariants
1. No oversell.
2. A seat has at most one active reservation at a time.
3. Active reservation statuses: `PENDING`, `RESERVED`.
4. Reservation transitions must be explicit and valid.
5. Confirm after expiry returns `410 RESERVATION_EXPIRED`.
6. Availability is derived dynamically; never manually decremented.
7. Soft-deleted rows are excluded from derived counts.

## Inventory Derivation
For published events:
- `capacity = count(seats where deletedAt is null)`
- `allocated = count(seats joined reservations where reservation.status='RESERVED' and both not soft-deleted)`
- `held = count(seats joined reservations where reservation.status='PENDING' and both not soft-deleted)`
- `available = capacity - allocated - held`

## Data Model Baseline
Core tables:
- `users`
- `sessions`
- `events`
- `seat_classes`
- `seats`
- `reservations`
- `payments`

Required constraints:
- Unique `users.email`
- Unique `events.slug`
- Unique `seats(event_id, row, column)`
- FK integrity across references
- Partial unique index for active seat lock:
  - unique `(event_id, seat_id)` where `status in ('PENDING','RESERVED')` and `deleted_at is null`
- Check `closed_at is null or closed_at > opened_at`
- Check `status='PENDING'` implies `expired_at is not null`

## Concurrency-Critical Flows
### Reserve seat (`POST /events/:slug/reservations`)
- Validate event is `PUBLISHED` and booking window is open.
- In one transaction:
  - Insert reservation as `PENDING` with `expiredAt`
  - Rely on partial unique index to block double-active seat
  - On unique conflict, return `409 SEAT_ALREADY_RESERVED`
  - Insert payment row as `PENDING`

### Confirm reservation (`POST /reservations/:id/confirm`)
- In one transaction:
  - Lock reservation row (`FOR UPDATE` equivalent)
  - Require reservation state is `PENDING`
  - If `now >= expiredAt`, fail with `410 RESERVATION_EXPIRED` (and optionally mark canceled)
  - Else set payment `PAID` + reservation `RESERVED` atomically

### Expiration worker
- Periodically cancel stale pending rows where:
  - `status='PENDING' and expired_at <= now`
- Availability recovers automatically via derived query.

## HTTP API Surface (W1)
Base path: `/api/v1`

Auth:
- `GET /auth/me`
- `POST /auth/register`
- `POST /auth/login`

Events:
- `GET /events`
- `GET /events/:slug`
- `POST /events`
- `PATCH /events/:slug`
- `DELETE /events/:slug`
- `POST /events/:slug/publish`

Seat classes:
- `GET /events/:slug/seat-classes`
- `GET /events/:slug/seat-classes/:seatClassId`
- `POST /events/:slug/seat-classes`
- `PATCH /events/:slug/seat-classes/:seatClassId`
- `DELETE /events/:slug/seat-classes/:seatClassId`

Seats:
- `POST /events/:slug/seats`
- `GET /events/:slug/seats`
- `GET /events/:slug/seats/:seatId`

Reservations:
- `POST /events/:slug/reservations`
- `GET /reservations/:reservationId`
- `POST /reservations/:reservationId/cancel`
- `POST /reservations/:reservationId/confirm`

Payments (stub):
- `GET /payments/:paymentId`

## DTO and Envelope Conventions
- Validate request payloads with Zod.
- Success envelope:
  - `status: "success"`
  - `message: string`
  - `data: T`
- Error envelope:
  - `status: "error"`
  - `message: string`
  - `error.code: string`
  - `error.detail: Record<string, unknown>`

Canonical error codes:
- `VALIDATION_ERROR` (422)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `SEAT_ALREADY_RESERVED` (409)
- `EVENT_NOT_MUTABLE` (409)
- `INVALID_RESERVATION_STATE_TRANSITION` (409)
- `RESERVATION_EXPIRED` (410)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

## Implementation Guardrails
- Keep published event config immutable in W1.
- Preserve state machine integrity; reject illegal transitions.
- Enforce ownership and role checks consistently.
- Wrap reservation + payment mutations in DB transactions.
- Prefer DB constraints/indexes over app-only checks for race safety.
- Use soft-delete aware queries for availability and reports.

## Definition of Done Alignment (W1D1)
Changes should keep alignment with:
1. Spec remains single source of truth.
2. No unresolved lifecycle/invariant ambiguity.
3. DB constraints are explicit and implementation-ready.
4. Endpoint/DTO contracts are coding-ready.
5. Concurrency/failure behavior is explicit.

## W1D2 Implementation Approach (Locked for this sprint)
- Prefer thin DB operation functions with curried signature: `(dbOrTx) => (args) => result`.
- Keep operations module-local, not global:
  - `src/modules/auth/operations.ts`
  - `src/modules/events/operations.ts`
  - `src/modules/reservations/operations.ts`
  - `src/modules/payments/operations.ts`
- Use `DbOrTx` from `src/db/client.ts` so the same operation works with both `db` and transaction `tx`.
- Keep operations single-purpose (mostly one query/mutation each).
- Keep workflow orchestration in service/use-case layer (not in route handlers, not in operations).
- Start transaction in service/use-case and pass `tx` into operations.
- Do not start nested transaction inside operation functions.
- Testing strategy for W1 prioritizes integration/e2e around critical flows over repository-mock unit tests.
- If a query is reused in 3+ places, extract/refactor within module; avoid introducing generic repository/UoW in W1.
- Guardrail: optimize for Friday ship date and correctness under concurrency.
