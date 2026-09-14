# Student Management System

A full-stack student register for college operations teams to manage student records, filters, validation, and CRUD workflows.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/student-management-system` — React/Vite web application and responsive UI.
- `artifacts/api-server/src/routes/students.ts` — student REST endpoints and validation.
- `lib/api-spec/openapi.yaml` — source of truth for student API contracts and generated hooks.
- `lib/db/src/schema/students.ts` — PostgreSQL/Drizzle student table and insert model.

## Architecture decisions

- The frontend uses generated React Query hooks from the OpenAPI contract instead of hand-written API types.
- Student data is stored in the pre-configured PostgreSQL database through Drizzle ORM.
- Calendar-only enrollment dates are stored as `YYYY-MM-DD` strings to avoid timezone shifts.
- The dashboard summary is a read-only aggregate endpoint so counts and department distribution stay database-backed.

## Product

- Dashboard with total, active, inactive, and department counts.
- Searchable and filterable student register.
- Create, edit, detail, and delete flows with client/server validation.
- Responsive desktop and mobile layouts with loading, empty, error, and confirmation states.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
