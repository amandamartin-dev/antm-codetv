# CodeTV Project (Linear-Style MVP)

This repository is doc-first and intended for agent execution.

## Current Local Run State
The project is currently set up for local development with a simple auth bypass enabled.

- Database: Postgres via Docker
- ORM: Prisma
- Framework: Next.js App Router
- Dev auth mode: bypass enabled with a seeded local user

### Dev Auth Bypass (Current Behavior)
When `ALLOW_DEV_BYPASS_AUTH=1` (already set in `.env`), app routes do not require Clerk login in local dev. The app uses `DEV_DEFAULT_CLERK_USER_ID` as the local user.

## Prerequisites
- Node.js `20+`
- pnpm
- Docker Desktop running

## Install
```bash
pnpm install
```

## 1) Start Postgres (Docker)
```bash
docker compose up -d
```

If port `5432` is already used by another Postgres container, either:
- stop that container, or
- point `DATABASE_URL` in `.env` to the running Postgres instance you want to use.

## 2) Prepare Database
```bash
pnpm prisma migrate dev --name init_mvp
pnpm prisma:seed
```

## 3) Start App
```bash
pnpm dev
```

Open:
- `http://localhost:3000`
- if `3000` is occupied, Next.js will choose another port (for example `3001`)

## Required Pages to Check
- `/`
- `/issues`
- `/issues/[issueKey]` (example: `/issues/ENG-1`)
- `/projects`
- `/projects/[projectKey]` (example: `/projects/CORE-PLATFORM`)
- `/teams`
- `/notifications`

## Quick API Smoke Checks
Use the same port your dev server started on:
```bash
curl http://localhost:3000/api/me
curl http://localhost:3000/api/dashboard
curl http://localhost:3000/api/issues
curl http://localhost:3000/api/projects
curl http://localhost:3000/api/notifications
```

## Useful Commands
```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

Notes:
- Integration tests are DB-backed and require `DATABASE_URL`.
- E2E test file exists, but execution depends on local env/browser setup.

## Environment
A local `.env` should include at least:
- `DATABASE_URL`
- `ALLOW_DEV_BYPASS_AUTH=1`
- `DEV_DEFAULT_CLERK_USER_ID=local_user_clerk_id`

For full Clerk auth (without bypass), set valid Clerk keys and disable bypass.
