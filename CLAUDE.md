# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project outline

This project is about a tool for families / Couples. They can create a shared task list, and assign tasks to each other. The main features are:

- Having a shared task list for the family / couple
- Assigning tasks to each other
- Marking tasks as done
- Planning Tasks for the week
- Uploading files related to the tasks (e.g. a shopping list, a recipe, etc.)

## Commands

```bash
bun dev          # Start dev server with Turbopack
bun build        # Production build
bun check        # Lint + TypeScript check
bun lint         # ESLint only
bun typecheck    # TypeScript only

bun db:generate  # Create and apply a new migration (dev)
bun db:migrate   # Apply migrations (prod)
bun db:push      # Push schema changes without migration (prototype)
bun db:studio    # Open Prisma Studio
```

## Stack

This is a [T3 Stack](https://create.t3.gg/) app: **Next.js 15 + tRPC + Prisma + PostgreSQL + Tailwind CSS + shadcn/ui**.

- **Package manager**: Bun
- **Runtime**: Node ESM (`"type": "module"`)
- **Path alias**: `~` maps to `src/`

## Architecture

### tRPC

- **Routers** live in `src/server/api/routers/`. Each router is registered in `src/server/api/root.ts` (`appRouter`).
- **Context** is created in `src/server/api/trpc.ts` — it exposes `db` (Prisma client). Add new context values here.
- **Procedures**: use `publicProcedure` from `src/server/api/trpc.ts`. No auth middleware exists yet.
- **Client-side**: import `api` from `~/trpc/react` (React Query hooks). For RSC, use `~/trpc/server`.

### Database

- Prisma client is generated into `generated/prisma/` (not the default location).
- Import the client as `import { PrismaClient } from "../../generated/prisma"` or via the singleton `db` from `~/server/db`.
- Schema: `Family` → `User` → `Task` (with `TaskStatus` enum: `TODO | IN_PROGRESS | DONE`).
- After editing `prisma/schema.prisma`, run `bun db:generate` (dev) or `bun db:push` (prototype).

### Environment

- Validated at startup via `@t3-oss/env-nextjs` in `src/env.js`.
- Required: `DATABASE_URL` (PostgreSQL connection string).
- Set `SKIP_ENV_VALIDATION=1` to bypass during Docker builds.
- Copy `.env.example` → `.env` to get started. A helper script `start-database.sh` spins up a local Postgres container.

### UI Components

- shadcn/ui components are added to `src/components/ui/`. Config in `components.json`.
- Utility: `cn()` from `~/lib/utils` (clsx + tailwind-merge).
- Add new shadcn components with: `bunx shadcn add <component>`
