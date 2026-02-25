# CBBSim

Full-stack college basketball coaching simulation foundation with complete vertical slice:

- **Frontend**: React + TypeScript + Tailwind (`apps/frontend`)
- **Backend/API**: Fastify + TypeScript (`apps/backend`)
- **Simulation Engine**: full-season team-vs-team simulator (`apps/backend/src/simulation.ts`)
- **Universe Builder**: procedural conference/team generator (`apps/backend/src/universe.ts`)
- **Database**: PostgreSQL + Prisma (`apps/backend/prisma/schema.prisma`)
- **Shared Contracts**: typed DTO models (`packages/shared`)

## Features implemented

- Generate a full league universe (`POST /api/universe/bootstrap`)
- Persist generated teams into PostgreSQL (Prisma upsert)
- Reload universe from DB (`GET /api/universe`)
- Simulate a complete double round-robin season (`POST /api/season/simulate`)
- Render roster database, ratings, standings, champion, and storylines in UI

## Quick start

```bash
npm install
cp apps/backend/.env.example apps/backend/.env
npm run prisma:generate
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## API endpoints

- `GET /api/health`
- `POST /api/universe/bootstrap`
- `GET /api/universe`
- `POST /api/season/simulate`
