# MineTrack

A monorepo for the MineTrack application.

## Structure

```
minetrack/
├── apps/
│   ├── frontend/     # React + Vite + TypeScript
│   └── backend/      # Node.js + Express + TypeScript + Prisma
├── scripts/          # Utility scripts
├── docs/             # Documentation
├── package.json      # Root workspace configuration
└── .env.example      # Environment variables template
```

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Supabase PostgreSQL database (cloud instance)

## Installation

```bash
# Install all dependencies
npm run install:all

# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials (see below)
```

### Supabase Database Setup

1. Create a Supabase project at https://supabase.com
2. Go to **Settings > Database** in your Supabase dashboard
3. Copy the connection strings:
   - **DATABASE_URL** (Connection pooling / PgBouncer): Use for application connections
   - **DIRECT_URL** (Direct connection): Use for migrations
4. Paste them into your `.env` file

Example `.env`:
```env
DATABASE_URL="<YOUR_DATABASE_URL>"
DIRECT_URL="<YOUR_DIRECT_URL>"
```

## Database Commands

```bash
# Generate Prisma Client (run after schema changes)
npm run prisma:generate --workspace=apps/backend

# Create and apply a new migration (development)
npm run prisma:migrate --workspace=apps/backend

# Apply pending migrations (production)
npm run prisma:migrate:deploy --workspace=apps/backend

# Open Prisma Studio (database GUI)
npm run prisma:studio --workspace=apps/backend

# Push schema changes without migration (development only)
npm run prisma:db:push --workspace=apps/backend
```

## Development

```bash
# Start both frontend and backend in development mode
npm run dev

# Start only frontend (port 5173)
npm run dev:frontend

# Start only backend (port 3000)
npm run dev:backend
```

## Building

```bash
# Build both applications
npm run build

# Build only frontend
npm run build:frontend

# Build only backend
npm run build:backend
```

## Production

```bash
# Build and start backend
npm run build
npm run start

# Build and preview frontend
npm run build:frontend
npm run start:frontend
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Backend server port | 3000 |
| NODE_ENV | Environment mode | development |
| DATABASE_URL | Supabase pooled connection string (PgBouncer) | - |
| DIRECT_URL | Supabase direct connection string | - |
| VITE_API_URL | Frontend API base URL | http://localhost:3000 |

## Health Check

Backend health endpoint: `GET /health`

Response (healthy):
```json
{
  "status": "ok",
  "timestamp": "2026-11-12T12:00:00.000Z",
  "uptime": 123.45,
  "environment": "development",
  "database": {
    "connected": true,
    "latency": 45
  }
}
```

Response (degraded - database unreachable):
```json
{
  "status": "degraded",
  "timestamp": "2026-11-12T12:00:00.000Z",
  "uptime": 123.45,
  "environment": "development",
  "database": {
    "connected": false,
    "error": "Can't reach database server at ..."
  }
}
```

- Returns `200 OK` when database is connected
- Returns `503 Service Unavailable` when database is unreachable

## API Reference

Base URL: `http://localhost:3000/api`

### Equipment Types

#### GET `/equipment-types`
List all equipment types with pagination.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Truck",
      "maintenanceIntervalHours": 250,
      "createdAt": "2026-11-12T...",
      "updatedAt": "2026-11-12T...",
      "_count": { "equipment": 5 }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```

#### GET `/equipment-types/:id`
Get equipment type by ID with associated equipment.

#### POST `/equipment-types`
Create a new equipment type.

**Body:**
```json
{
  "name": "Truck",
  "maintenanceIntervalHours": 250
}
```

#### PUT `/equipment-types/:id`
Update an equipment type.

#### DELETE `/equipment-types/:id`
Delete an equipment type (fails if equipment exists).

---

### Equipment

#### GET `/equipment`
List all equipment with pagination and maintenance progress.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `equipmentTypeId` (UUID) - Filter by equipment type
- `status` (string) - Filter by status
- `maintenanceRequired` (boolean) - Filter by maintenance status

**Response includes `maintenanceProgress`:**
```json
{
  "data": [{
    "id": "uuid",
    "code": "TRK-001",
    "equipmentTypeId": "uuid",
    "horometer": 100,
    "lastMaintenanceHorometer": 100,
    "appliedIntervalHours": 250,
    "equipmentType": { "id": "...", "name": "Truck", "maintenanceIntervalHours": 250 },
    "maintenanceProgress": {
      "hoursSinceMaintenance": 0,
      "progress": 0,
      "maintenanceRequired": false
    }
  }],
  "pagination": { ... }
}
```

#### GET `/equipment/:id`
Get equipment by ID with maintenance history (last 10 records).

#### POST `/equipment`
Create new equipment.

**Body:**
```json
{
  "code": "TRK-001",
  "equipmentTypeId": "uuid",
  "horometer": 100,
  "appliedIntervalHours": 250  // Optional: defaults to equipment type's interval
}
```

**Validation:**
- `code` must be unique
- `equipmentTypeId` must exist
- `horometer` must be non-negative
- `appliedIntervalHours` must be positive

#### PUT `/equipment/:id`
Update equipment.

**Body (all optional):**
```json
{
  "code": "TRK-002",
  "equipmentTypeId": "uuid",
  "horometer": 200,
  "appliedIntervalHours": 300
}
```

**Validation:**
- Horometer cannot decrease
- Equipment type must exist if changed

#### DELETE `/equipment/:id`
Delete equipment (cascades to maintenance records).

---

### Maintenance

#### GET `/maintenance`
List all maintenance records with pagination.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `equipmentId` (UUID) - Filter by equipment
- `startDate` (ISO date) - Filter by date range start
- `endDate` (ISO date) - Filter by date range end

#### GET `/maintenance/equipment/:id`
Get maintenance history for specific equipment.

#### POST `/maintenance/equipment/:id`
Register maintenance for equipment (uses database transaction).

**Body:**
```json
{
  "horometerAtMaintenance": 350,
  "description": "Oil change and filter replacement"
}
```

**Business Rules (enforced):**
1. `horometerAtMaintenance` >= current equipment horometer
2. `horometerAtMaintenance` >= last maintenance horometer
3. On success:
   - Creates maintenance record
   - Updates equipment `horometer` = `horometerAtMaintenance`
   - Updates `lastMaintenanceHorometer` = `horometerAtMaintenance`
   - Updates `appliedIntervalHours` = equipment type's current `maintenanceIntervalHours`
   - Total horometer is preserved (updated to maintenance reading)

**Response:**
```json
{
  "maintenance": { ... },
  "equipment": {
    ...,
    "maintenanceProgress": {
      "hoursSinceMaintenance": 0,
      "progress": 0,
      "maintenanceRequired": false
    }
  }
}
```

---

### Business Rules Summary

1. **Horometer**: Never decreases through normal updates
2. **Maintenance Progress**: `hoursSinceMaintenance = horometer - lastMaintenanceHorometer`
3. **Progress %**: `hoursSinceMaintenance / appliedIntervalHours * 100`
4. **Maintenance Required**: When `hoursSinceMaintenance >= appliedIntervalHours`
5. **Maintenance Registration** (transactional):
   - Records current horometer
   - Creates history entry
   - Updates `lastMaintenanceHorometer`
   - Updates `appliedIntervalHours` to equipment type's current default
   - Preserves total horometer
6. **Applied Interval**: Retained throughout maintenance cycle; updated only on maintenance registration
7. **Duplicate Codes**: Prevented at database level (unique constraint)
8. **Invalid Values**: Validated at API level

---

### Error Responses

All errors follow consistent format:
```json
{
  "error": "Human readable message",
  "code": "ERROR_CODE",
  "details": {}
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `BAD_REQUEST` | 400 | Business rule violation |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate unique field |
| `INTERNAL_ERROR` | 500 | Server error |

---

### Initial Equipment Types (Seeded)

| Type | Maintenance Interval |
|------|---------------------|
| Truck | 250 hours |
| Excavator | 500 hours |
| Drilling Machine | 300 hours |

> **Note**: These intervals are illustrative demo values and not actual manufacturer recommendations.

---

## Tests

Run the test suite:
```bash
cd apps/backend && npx tsx scripts/test-api.ts
```

Tests cover:
- ✅ Equipment creation
- ✅ Unique equipment code enforcement
- ✅ Horometer validation (no decrease)
- ✅ Maintenance threshold calculation
- ✅ Maintenance registration
- ✅ Horometer preservation after maintenance
- ✅ Applied interval update after maintenance
- ✅ Maintenance history queries
- ✅ Filter by maintenance required

---

## License

Private