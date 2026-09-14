---
name: Student app integration lessons
description: Non-obvious compatibility rules for generated TypeScript clients and calendar-only database fields.
---

Generated fetch clients may use `Headers.entries()`, which requires `dom.iterable` in the shared TypeScript library settings.

**Why:** The workspace's strict library defaults did not include iterable DOM types, so API code generation succeeded but the shared typecheck failed.

**How to apply:** When generated client code reports that `Headers.entries()` is missing, add `dom.iterable` to the relevant library package's `lib` list.

Calendar-only OpenAPI date inputs are coerced to `Date` by generated Zod schemas, while Drizzle date columns configured with string mode expect `YYYY-MM-DD`.

**Why:** Keeping date-only fields as strings in PostgreSQL avoids timezone shifts, but the generated server parser still returns a `Date`.

**How to apply:** Convert parsed date values back to an ISO calendar-date string immediately before insert or update; leave response values to the generated response schema.