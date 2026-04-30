# W1D1 Spec - TicketGuard API

## 1) Scope Lock

### Problem
Event organizers need a reliable ticketing backend to publish events, manage seat inventory, and process reservations safely under concurrent demand. The system must prevent invalid booking states and overselling.

### Target Users
- Organizer: creates and manages events, seat classes, and seat inventory.
- Audience user: reserves a seat fairly and reliably under high demand.

### Week 1 Milestone (Friday-shippable)
A backend API with:
- auth (register/login/me)
- organizer-owned event CRUD + publish
- seat class + seat inventory management for draft events
- reservation hold + confirm flow with race-condition safety
- explicit API contracts via Zod + typed response envelopes
- local Postgres via Docker + Drizzle schema/migrations

### In Scope (W1)
- Auth + role resolution (`USER`, `ORGANIZER`, seed-only `ADMIN`)
- Event lifecycle (`DRAFT -> PUBLISHED`)
- Reservation lifecycle (`PENDING -> RESERVED/CANCELED`)
- Stub payment lifecycle to support reservation confirmation
- Expiration worker for stale pending holds
- Rate limit on reservation/payment-sensitive endpoints

### Out of Scope (W1)
- Real payment gateway integration
- Refund workflow execution
- Admin UI/dashboard
- Notifications/email/SMS
- Multi-service architecture

---

## 2) Locked Product Decisions

1. Payment in W1: **stub only** (no real gateway integration).  
2. Published event mutability: **hard freeze** for event commercial/configuration fields.  
3. Confirm vs expiry boundary: **strict cutoff** (`now >= expiredAt` => confirm fails).  
4. Admin creation: **seed-only**, not allowed via public register API.  
5. API naming style: **plural resources**.

---

## 3) Roles and Access

type UserRole = "ORGANIZER" | "ADMIN" | "USER";

- `USER`: browse events, create/cancel/confirm own reservations.
- `ORGANIZER`: manage own draft events, seat classes, seats, and publish events.
- `ADMIN`: privileged operations (seeded account only in W1).
- Mutation rule: only owner organizer or admin may mutate event resources.

---

## 4) Lifecycle and State Machines

type EventStatus = "DRAFT" | "PUBLISHED";
type ReservationStatus = "PENDING" | "RESERVED" | "CANCELED";
type PaymentStatus = "PENDING" | "PAID" | "FAILED";

### Event Lifecycle
- Create event => `DRAFT`
- `DRAFT -> PUBLISHED` allowed only when:
  - at least one seat class exists
  - at least one seat exists
  - booking window is valid (`closedAt == null || closedAt > openedAt`)
- After publish: event config is immutable in W1.

### Reservation Lifecycle
- Create reservation => `PENDING` + `expiredAt` (default hold window: 5 minutes)
- `PENDING -> RESERVED` via successful confirm before expiry
- `PENDING -> CANCELED` via explicit cancel or expiration worker
- `RESERVED` is terminal in W1

### Payment Lifecycle (Stub)
- On reservation create, create payment row as `PENDING`
- Confirm flow marks payment `PAID` and reservation `RESERVED` atomically
- Failed confirm marks payment `FAILED` (optional path for test scenarios)

---

## 5) Non-Negotiable Invariants

1. No oversell: confirmed seats cannot exceed seat capacity.
2. A seat can have at most one active reservation at a time.
3. Active reservation statuses are `PENDING` and `RESERVED`.
4. Reservation state transitions must be valid and explicit.
5. Confirm after expiry is rejected (`410 RESERVATION_EXPIRED`).
6. Availability is derived dynamically, never manually decremented.
7. Soft-deleted rows are excluded from derived counts.

---

## 6) Derived Inventory Rules

For a published event:

- `capacity = count(seat.id where seat.deletedAt is null)`
- `allocated = count(seat.id joined active reservation where reservation.status='RESERVED' and deletedAt is null)`
- `held = count(seat.id joined active reservation where reservation.status='PENDING' and deletedAt is null)`
- `available = capacity - allocated - held`

---

## 7) Data Model Draft (Drizzle/Postgres)

Core tables:
- `users`
- `sessions`
- `events`
- `seat_classes`
- `seats`
- `reservations`
- `payments`

Recommended key columns:
- `users(id, email, name, role, created_at, updated_at, deleted_at)`
- `events(id, organizer_id, slug, name, description, status, opened_at, closed_at, created_at, updated_at, deleted_at)`
- `seat_classes(id, event_id, name, price_idr, created_at, updated_at, deleted_at)`
- `seats(id, event_id, class_id, name, row, column, created_at, updated_at, deleted_at)`
- `payments(id, amount_idr, status, created_at, updated_at, deleted_at)`
- `reservations(id, user_id, event_id, seat_id, payment_id, status, expired_at, created_at, updated_at, deleted_at)`

### Required Constraints
- Unique `users.email`
- Unique `events.slug`
- Unique `seats(event_id, row, column)`
- FK integrity across all references
- Partial unique index for active seat lock:
  - unique `(event_id, seat_id)` where `status in ('PENDING','RESERVED')` and `deleted_at is null`
- Check: `closed_at is null or closed_at > opened_at`
- Check: if `status='PENDING'` then `expired_at is not null`

---

## 8) Concurrency Strategy (Authoritative)

### Reserve Seat (`POST /events/:slug/reservations`)
- Validate event is `PUBLISHED`, in booking window.
- Start transaction.
- Attempt insert `PENDING` reservation for `(event_id, seat_id)`.
- Rely on partial unique active-reservation index to prevent double-active seat.
- On unique conflict => return `409 SEAT_ALREADY_RESERVED`.
- Create payment row `PENDING` in same transaction.
- Commit.

### Confirm Reservation (`POST /reservations/:id/confirm`)
- Start transaction.
- Lock reservation row (`FOR UPDATE` equivalent through ORM/query).
- Validate reservation still `PENDING`.
- If `now >= expired_at`: set `CANCELED` (or fail and let worker cancel), return `410 RESERVATION_EXPIRED`.
- Else set payment `PAID` and reservation `RESERVED` atomically.
- Commit.

### Expiration Worker
- Periodically cancel stale pending reservations:
  - `status='PENDING' AND expired_at <= now`
- Seat becomes available automatically via derived inventory query.

---

## 9) HTTP API Contract (W1)

Base path: `/api/v1`

### Auth
- `GET /auth/me`
- `POST /auth/register`
- `POST /auth/login`

### Events
- `GET /events`
- `GET /events/:slug`
- `POST /events`
- `PATCH /events/:slug`
- `DELETE /events/:slug`
- `POST /events/:slug/publish`

### Seat Classes
- `GET /events/:slug/seat-classes`
- `GET /events/:slug/seat-classes/:seatClassId`
- `POST /events/:slug/seat-classes`
- `PATCH /events/:slug/seat-classes/:seatClassId`
- `DELETE /events/:slug/seat-classes/:seatClassId`

### Seats
- `POST /events/:slug/seats`
- `GET /events/:slug/seats`
- `GET /events/:slug/seats/:seatId`

### Reservations
- `POST /events/:slug/reservations`
- `GET /reservations/:reservationId`
- `POST /reservations/:reservationId/cancel`
- `POST /reservations/:reservationId/confirm`

### Payments (stub)
- `GET /payments/:paymentId`

---

## 10) Request/Response Contracts

### Register
{
  email: string;
  password: string;
  name: string;
  role: "ORGANIZER" | "USER"; // ADMIN not allowed
}

### Login
{
  email: string;
  password: string;
}

### Create/Update Event
{
  slug: string;
  name: string;
  description: string;
  openedAt: string; // ISO datetime
  closedAt: string | null; // ISO datetime
}

### Create/Update Seat Class
{
  name: string;
  priceIdr: number; // integer >= 0
}

### Create Seats (Bulk)
{
  seats: Array<{
    name: string;
    row: string;
    column: string;
    classId: string;
  }>;
}

### Create Reservation
{
  seatId: string;
}

### Standard Success Envelope
type SuccessResponse<T> = {
  status: "success";
  message: string;
  data: T;
};

### Standard Error Envelope
type ErrorResponse<T extends string> = {
  status: "error";
  message: string;
  error: {
    code: T;
    detail: Record<string, unknown>;
  };
};

### Canonical Error Codes (W1)
- `VALIDATION_ERROR` (422)
- `UNAUTHORIZED` (401)
- `FORBIDDEN_ROLE_OR_OWNERSHIP` (403)
- `NOT_FOUND` (404)
- `SEAT_ALREADY_RESERVED` (409)
- `EVENT_NOT_MUTABLE` (409)
- `INVALID_RESERVATION_STATE_TRANSITION` (409)
- `RESERVATION_EXPIRED` (410)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

---

## 11) W1D1 Deliverables and DoD

Day 1 is done when:
1. This spec is approved as single source of truth.
2. No unresolved core ambiguity remains in lifecycle/invariants.
3. DB constraints are explicit and implementation-ready.
4. Endpoint and DTO contracts are clear enough for Day 2 coding.
5. Concurrency strategy and failure behavior are explicitly documented.

---

## 12) Day 2 Build Plan (Handoff)

1. Scaffold Hono modules and route groups with Zod validators.
2. Implement auth and request identity middleware.
3. Add Drizzle schema + first migration with all required constraints/indexes.
4. Implement draft-only event/seat-class/seat mutations + publish checks.
5. Implement reservation transaction path and conflict handling.
