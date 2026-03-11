# Linear-Style MVP Runbook (Agent Execution)

## 1. Prerequisites

- Node.js `20.x` or later
- `pnpm` installed
- Docker Desktop installed/running
- Clerk account + GitHub OAuth configured in Clerk

## 2. Bootstrap Project

1. Create app:
   - `pnpm create next-app@latest` (TypeScript, App Router, ESLint)
2. Install core deps:
   - `pnpm add @clerk/nextjs prisma @prisma/client zod react-hook-form @tanstack/react-query recharts`
3. Install dev deps:
   - `pnpm add -D tsx vitest @vitest/ui @testing-library/react playwright`

## 3. Postgres (Docker)

Use local docker compose with one Postgres service.

- `docker compose up -d`
- Verify DB health before migration.

## 4. Environment Variables

Required envs:
- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`

## 5. Data Layer

1. Create Prisma schema per `MVP_AGENT_SPEC.md`.
2. Run migration:
   - `pnpm prisma migrate dev`
3. Seed minimum data:
   - one admin user mapping
   - one team (`ENG`)
   - one project
   - one release
   - one label
   - one issue with dependency example

## 6. Auth and Access

1. Add Clerk middleware to protect app routes.
2. Implement user sync from Clerk webhook or on-login upsert.
3. Implement role and membership guards in server layer.

## 7. Feature Build Order

1. Teams + users + access control
2. Projects + releases + project members
3. Labels (single-label model)
4. Issues + dependencies + comments
   - include mention parsing (`@user`, `#issue`, `~project`) and mention-linked notifications
5. Notifications (in-app only)
6. Dashboard charts (progress only)

## 8. Testing

- Unit: run `pnpm test:unit`
- Integration: run `pnpm test:integration`
- E2E: install browsers once, then run `pnpm test:e2e`

## 9. Acceptance Run

- Start app: `pnpm dev`
- Validate:
  - GitHub SSO login via Clerk
  - CRUD flows for issues/projects/teams
  - dependency and due date behavior
  - comment mentions resolve and create notification entries
  - dashboard progress + inbox notifications
