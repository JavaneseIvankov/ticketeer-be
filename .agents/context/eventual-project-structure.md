# Eventual Project Structure

## Summary
This is the target Week 1 backend structure once the codebase has enough pressure to justify splitting modules into dedicated route, schema, service, and repository files.

The architecture is a feature-first modular monolith:
- keep domain logic inside `auth`, `events`, `reservations`, and `payments`
- keep cross-cutting transport and infrastructure in `shared`, `config`, and `db`
- avoid global `controllers/`, `services/`, or `repositories/` folders

## Target Layout

```text
ticketeer-be/
├─ drizzle.config.ts
├─ drizzle/
│  └─ *.sql
├─ docker-compose.dev.yml
├─ src/
│  ├─ index.ts
│  ├─ app.ts
│  ├─ config/
│  │  ├─ env.ts
│  │  └─ constants.ts
│  ├─ db/
│  │  ├─ client.ts
│  │  ├─ schema/
│  │  │  ├─ users.ts
│  │  │  ├─ sessions.ts
│  │  │  ├─ events.ts
│  │  │  ├─ seat-classes.ts
│  │  │  ├─ seats.ts
│  │  │  ├─ reservations.ts
│  │  │  ├─ payments.ts
│  │  │  └─ index.ts
│  │  ├─ migrations/
│  │  └─ seed.ts
│  ├─ shared/
│  │  ├─ errors/
│  │  │  ├─ app-error.ts
│  │  │  └─ error-codes.ts
│  │  ├─ http/
│  │  │  ├─ envelope.ts
│  │  │  ├─ responses.ts
│  │  │  └─ validators.ts
│  │  ├─ middleware/
│  │  │  ├─ auth.ts
│  │  │  ├─ require-role.ts
│  │  │  ├─ rate-limit.ts
│  │  │  └─ error-handler.ts
│  │  ├─ security/
│  │  │  ├─ jwt.ts
│  │  │  ├─ password.ts
│  │  │  └─ session.ts
│  │  └─ utils/
│  │     ├─ clock.ts
│  │     ├─ ids.ts
│  │     └─ pagination.ts
│  └─ modules/
│     ├─ auth/
│     │  ├─ auth.routes.ts
│     │  ├─ auth.service.ts
│     │  ├─ auth.repo.ts
│     │  ├─ auth.schema.ts
│     │  └─ auth.types.ts
│     ├─ events/
│     │  ├─ event.routes.ts
│     │  ├─ event.service.ts
│     │  ├─ event.repo.ts
│     │  ├─ event.schema.ts
│     │  ├─ seat-class.routes.ts
│     │  ├─ seat-class.service.ts
│     │  ├─ seat-class.repo.ts
│     │  ├─ seat-class.schema.ts
│     │  ├─ seat.routes.ts
│     │  ├─ seat.service.ts
│     │  ├─ seat.repo.ts
│     │  ├─ seat.schema.ts
│     │  └─ availability.query.ts
│     ├─ reservations/
│     │  ├─ reservation.routes.ts
│     │  ├─ reservation.service.ts
│     │  ├─ reservation.repo.ts
│     │  ├─ reservation.schema.ts
│     │  ├─ reservation-state.ts
│     │  └─ expiration-job.ts
│     └─ payments/
│        ├─ payment.routes.ts
│        ├─ payment.repo.ts
│        ├─ payment.schema.ts
│        └─ payment.types.ts
└─ tests/
   ├─ http/
   ├─ integration/
   └─ concurrency/
```

## Boundary Rules
- `src/index.ts` is bootstrap only: env load, app startup, and expiration worker startup.
- `src/app.ts` creates the Hono app and mounts `/api/v1` routes.
- `src/modules/events` owns events, seat classes, seats, publish validation, and derived availability.
- `src/modules/reservations` owns hold, confirm, cancel, expiry, and reservation state transitions.
- `src/modules/payments` stays stub-focused in W1; reservation confirmation still orchestrates payment updates atomically.
- `src/shared` is only for true cross-cutting concerns. Domain rules do not move there.

## Split Expectations
- use this structure when module `index.ts` files become hard to scan
- split by concern into `routes`, `schema`, `service`, and `repo`
- keep refactors mechanical by preserving domain boundaries from the start
