import Fastify from "fastify";
import { Prisma, PrismaClient } from "@prisma/client";
import type {
  ActiveSeasonState,
  BootstrapUniverseRequest,
  LeagueStateSnapshot,
  SeasonSimulationInput,
  UniverseSnapshot,
} from "@cbbsim/shared";
import { z } from "zod";
import { initializeSeason, runSeasonSimulation, simulateSeasonSpan } from "./simulation.js";
import { runOffseason } from "./offseason.js";
import { bootstrapUniverse } from "./universe.js";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

const LEAGUE_STATE_ID = "primary";

let universe: UniverseSnapshot | null = null;
let activeSeason: ActiveSeasonState | null = null;

const bootstrapSchema = z.object({
  leagueName: z.string().min(3).max(80),
  conferenceNames: z.array(z.string().min(2).max(40)).min(1).max(16),
  teamsPerConference: z.number().int().min(4).max(20),
});

const seasonInputSchema = z.object({
  teams: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        conference: z.string(),
        abr: z.string(),
        mascot: z.string(),
        colors: z.array(z.string()).min(1).max(3),
        rosterTalent: z.number().min(0).max(100),
        coaching: z.number().min(0).max(100),
        facilities: z.number().min(0).max(100),
        nilStrength: z.number().min(0).max(100),
        defenseDiscipline: z.number().min(0).max(100),
        tempoControl: z.number().min(0).max(100),
        prestige: z.number().min(0).max(100),
        expectedWins: z.number().min(0).max(40),
      }),
    )
    .min(8),
  injuryVariance: z.number().min(0).max(30),
  chaosFactor: z.number().min(0).max(30),
  fatigueImpact: z.number().min(0).max(20),
});

const progressSchema = z.object({
  mode: z.enum(["day", "week", "season"]),
});

const saveLeagueState = async () => {
  await prisma.leagueState.upsert({
    where: { id: LEAGUE_STATE_ID },
    update: {
      universe: universe ?? Prisma.JsonNull,
      season: activeSeason ?? Prisma.JsonNull,
    },
    create: {
      id: LEAGUE_STATE_ID,
      universe: universe ?? Prisma.JsonNull,
      season: activeSeason ?? Prisma.JsonNull,
    },
  });
};

const loadLeagueState = async () => {
  const state = await prisma.leagueState.findUnique({ where: { id: LEAGUE_STATE_ID } });

  if (!state) {
    return;
  }

  universe = (state.universe as UniverseSnapshot | null) ?? null;
  activeSeason = (state.season as ActiveSeasonState | null) ?? null;
};

app.get("/api/health", async () => ({ ok: true, now: new Date().toISOString() }));
app.get("/api/state", async (): Promise<LeagueStateSnapshot> => ({
  universe,
  activeSeason,
  savedAt: new Date().toISOString(),
}));

app.post("/api/universe/bootstrap", async (request, reply) => {
  const parsed = bootstrapSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.flatten() });
  }

  const payload = parsed.data as BootstrapUniverseRequest;
  universe = bootstrapUniverse(payload);
  activeSeason = null;

  await Promise.all(
    universe.teams.map((team) =>
      prisma.team.upsert({
        where: { id: team.id },
        update: {
          name: team.name,
          conference: team.conference,
          currentPrestige: Math.round(team.prestige),
          facilityRating: Math.round(team.facilities),
          nilStrength: Math.round(team.nilStrength),
          rosterTalent: Math.round(team.rosterTalent),
          coachingRating: Math.round(team.coaching),
          defenseDiscipline: Math.round(team.defenseDiscipline),
          tempoControl: Math.round(team.tempoControl),
        },
        create: {
          id: team.id,
          name: team.name,
          conference: team.conference,
          currentPrestige: Math.round(team.prestige),
          facilityRating: Math.round(team.facilities),
          nilStrength: Math.round(team.nilStrength),
          rosterTalent: Math.round(team.rosterTalent),
          coachingRating: Math.round(team.coaching),
          defenseDiscipline: Math.round(team.defenseDiscipline),
          tempoControl: Math.round(team.tempoControl),
        },
      }),
    ),
  );

  await saveLeagueState();
  return { universe };
});

app.get("/api/universe", async () => {
  if (universe) {
    return { universe };
  }

  await loadLeagueState();
  if (universe) {
    return { universe };
  }

  const teams = await prisma.team.findMany({ orderBy: [{ conference: "asc" }, { name: "asc" }] });
  if (teams.length === 0) {
    return { universe: null };
  }

  universe = {
    leagueName: "Recovered League",
    generatedAt: new Date().toISOString(),
    teams: teams.map((team: (typeof teams)[number]) => ({
      id: team.id,
      name: team.name,
      conference: team.conference,
      abr: team.id.toUpperCase(),
      mascot: "Program",
      colors: ["111111", "eeeeee"],
      rosterTalent: team.rosterTalent,
      coaching: team.coachingRating,
      facilities: team.facilityRating,
      nilStrength: team.nilStrength,
      defenseDiscipline: team.defenseDiscipline,
      tempoControl: team.tempoControl,
      prestige: team.currentPrestige,
      expectedWins: 14,
    })),
  };

  await saveLeagueState();
  return { universe };
});

app.post("/api/season/start", async (request, reply) => {
  const parsed = seasonInputSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.flatten() });
  }

  const payload = parsed.data as SeasonSimulationInput;
  activeSeason = initializeSeason(payload);

  await saveLeagueState();
  return { season: activeSeason };
});

app.get("/api/season", async () => {
  if (!activeSeason) {
    await loadLeagueState();
  }

  return { season: activeSeason };
});

app.post("/api/season/progress", async (request, reply) => {
  const parsed = progressSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.flatten() });
  }

  if (!activeSeason) {
    await loadLeagueState();
  }

  if (!activeSeason) {
    return reply.code(400).send({ error: "No active season. Start one first." });
  }

  activeSeason = simulateSeasonSpan(activeSeason, parsed.data.mode);
  await saveLeagueState();

  return { season: activeSeason };
});

app.post("/api/season/simulate", async (request, reply) => {
  const parsed = seasonInputSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.flatten() });
  }

  const payload = parsed.data as SeasonSimulationInput;
  const result = runSeasonSimulation(payload);

  return { result };
});


app.get("/api/offseason", async () => {
  if (!activeSeason) {
    await loadLeagueState();
  }

  return { offseason: activeSeason?.offseason ?? null };
});

app.post("/api/offseason/run", async (_request, reply) => {
  if (!activeSeason) {
    await loadLeagueState();
  }

  if (!activeSeason) {
    return reply.code(400).send({ error: "No active season. Start one first." });
  }

  if (!activeSeason.isComplete) {
    return reply.code(400).send({ error: "Offseason requires a completed season." });
  }

  const offseason = runOffseason(activeSeason);
  activeSeason = { ...activeSeason, offseason };
  await saveLeagueState();

  return { offseason };
});

const start = async () => {
  try {
    await loadLeagueState();
    await app.listen({ host: "0.0.0.0", port: 4000 });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
