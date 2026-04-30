# Initial Project Structure

## Summary
This is the recommended Week 1 development structure for speed. It keeps the same feature-first modular boundaries as the eventual architecture, but starts each domain as a collapsed `index.ts`.

The rule is:
- collapse within a domain when it is faster
- do not collapse across domains

## Recommended Initial Layout

```text
ticketeer-be/
├─ drizzle.config.ts
├─ drizzle/
│  └─ *.sql
├─ src/
│  ├─ index.ts
│  ├─ app.ts
│  ├─ config/
│  │  └─ env.ts
│  ├─ db/
│  │  ├─ client.ts
│  │  ├─ schema.ts
│  │  └─ seed.ts
│  ├─ shared/
│  │  ├─ errors.ts
│  │  ├─ http.ts
│  │  ├─ auth.ts
│  │  ├─ rate-limit.ts
│  │  └─ utils.ts
│  └─ modules/
│     ├─ auth/
│     │  └─ index.ts
│     ├─ events/
│     │  └─ index.ts
│     ├─ reservations/
│     │  └─ index.ts
│     └─ payments/
│        └─ index.ts
└─ tests/
   ├─ http/
   ├─ integration/
   └─ concurrency/
```

## Module Rules
- `src/index.ts` is bootstrap only: load env, start app, start inline expiration worker.
- `src/app.ts` creates the Hono app and mounts all `/api/v1` routes.
- `src/db/schema.ts` may stay as one file initially.
- each module `index.ts` may contain:
  - Zod schemas and types
  - Drizzle query helpers
  - business logic
  - route registration

## Internal Ordering For Collapsed Module Files
Inside each module `index.ts`, keep this order:
1. imports and constants
2. Zod schemas and exported types
3. local repository/query helpers
4. business logic and transactions
5. route registration and module exports

## Guardrails
- do not create global `controllers/`, `services/`, or `repositories/`
- do not move reservation state rules into `shared`
- do not move publish immutability rules into generic helpers
- keep response envelope helpers centralized in `shared/http.ts`
- keep ownership and workflow rules inside their domain modules

## Split Triggers
Split a module `index.ts` into multiple files when:
- the file exceeds roughly 300 to 400 lines
- route families are competing for space
- transaction logic becomes hard to scan
- validation noise starts hiding business logic
- multiple engineers would likely edit the same file

When splitting:
- keep `index.ts` as the entrypoint or route wiring file
- extract into `schema.ts`, `service.ts`, and `repo.ts`
- add focused files like `expiration-job.ts` or `availability.query.ts` only when justified
