# CBBSim

Full-stack college basketball coaching simulation foundation with complete vertical slice:

- **Frontend**: React + TypeScript + Tailwind (`apps/frontend`)
- **Backend/API**: Fastify + TypeScript (`apps/backend`)
- **Simulation Engine**: progressive day/week/season simulation (`apps/backend/src/simulation.ts`)
- **Universe Builder**: procedural conference/team generator (`apps/backend/src/universe.ts`)
- **Database**: PostgreSQL + Prisma (`apps/backend/prisma/schema.prisma`)
- **Shared Contracts**: typed DTO models (`packages/shared`)

## Implemented features

- Generate a full league universe (`POST /api/universe/bootstrap`)
- Persist generated teams into PostgreSQL (Prisma upsert)
- Save/load league state snapshot (universe + active season progression)
- Start a season and simulate by day/week/full season
- Build simplified conference postseason bracket from top-8 standings
- Basic rankings with NET-like composite and poll score
- Frontend pages: dashboard, team profile, standings, game log
- Phase 2 offseason systems: recruit generation + scouting uncertainty, transfer portal decisions, NIL budgets, scholarship enforcement

## Quick start

```bash
npm install
cp apps/backend/.env.example apps/backend/.env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## API endpoints

- `GET /api/health`
- `GET /api/state`
- `POST /api/universe/bootstrap`
- `GET /api/universe`
- `POST /api/season/start`
- `GET /api/season`
- `POST /api/season/progress`
- `POST /api/season/simulate`
- `GET /api/offseason`
- `POST /api/offseason/run`
