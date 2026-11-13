# AGENTS.md — MineTrack Agent Instructions

## Project Overview

MineTrack is a monorepo containing:
- **Frontend**: React + Vite + TypeScript (port 5173)
- **Backend**: Node.js + Express + TypeScript (port 3000)
- **Database**: Supabase PostgreSQL (cloud instance)
- **ORM**: Prisma

## Architecture Rules

1. **No Next.js** — Use Vite for frontend
2. **No microservices** — Single backend application
3. **No unnecessary abstractions** — Keep code simple and direct
4. **Frontend/Backend independence** — Each app is self-contained
5. **Secrets never committed** — Use `.env` files (gitignored)

## Development Workflow

### Starting Development

```bash
npm run dev           # Starts both frontend and backend
npm run dev:frontend  # Frontend only
npm run dev:backend   # Backend only
```

### Building

```bash
npm run build         # Build both apps
npm run build:frontend
npm run build:backend
```

### Type Checking

```bash
npm run typecheck     # Check both apps
```

## Backend Conventions

- Entry point: `apps/backend/src/index.ts`
- Health endpoint: `GET /health` (includes database connectivity check)
- API prefix: `/api`
- Environment via `dotenv` (load at top of entry point)
- Database via Prisma Client (`@prisma/client`)
- CORS enabled for frontend origin

## Frontend Conventions

- Entry point: `apps/frontend/src/main.tsx`
- API calls via `VITE_API_URL` (proxied in dev)
- Path alias `@/*` → `src/*`
- Strict TypeScript enabled

## Adding Dependencies

```bash
# Frontend
cd apps/frontend && npm install <package>

# Backend
cd apps/backend && npm install <package>

# Root (dev tools)
npm install -D <package>
```

## Database (Prisma + Supabase)

- **ORM**: Prisma Client (`@prisma/client`)
- **Migrations**: Prisma Migrate (`prisma migrate dev`)
- **Schema**: `apps/backend/prisma/schema.prisma`
- **Connection**: Uses `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) from env
- **Never hardcode credentials** — always from env

### Prisma Commands

```bash
# Generate client (after schema changes)
npm run prisma:generate --workspace=apps/backend

# Create migration (development)
npm run prisma:migrate --workspace=apps/backend

# Apply migrations (production)
npm run prisma:migrate:deploy --workspace=apps/backend

# Open Prisma Studio
npm run prisma:studio --workspace=apps/backend

# Push schema without migration (dev only)
npm run prisma:db:push --workspace=apps/backend
```

### Supabase Connection

- Get `DATABASE_URL` and `DIRECT_URL` from Supabase Dashboard > Settings > Database
- `DATABASE_URL`: Uses PgBouncer (port 6543) for connection pooling
- `DIRECT_URL`: Direct connection (port 5432) for migrations
- Both required in `.env`

## Testing Commands

```bash
# Backend health check (includes DB)
curl http://localhost:3000/health

# Frontend dev server
curl http://localhost:5173
```

## File Patterns to Know

- Root scripts: `scripts/`
- Documentation: `docs/`
- Frontend source: `apps/frontend/src/`
- Backend source: `apps/backend/src/`
- Prisma schema: `apps/backend/prisma/schema.prisma`
- Prisma migrations: `apps/backend/prisma/migrations/`
- Shared types: consider `packages/shared` if needed later