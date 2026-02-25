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
const persistenceEnabled = Boolean(process.env.DATABASE_URL);

let universe: UniverseSnapshot | null = null;
let activeSeason: ActiveSeasonState | null = null;

const bootstrapSchema = z.object({
  leagueName: z.string().min(3).max(80),
  conferenceNames: z.array(z.string().min(2).max(40)).min(1).max(32),
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
        boosterBudget: z.number().min(0).max(500),
        mediaMarket: z.number().min(0).max(100),
        fanIntensity: z.number().min(0).max(100),
        arenaCapacity: z.number().min(1000).max(50000),
        academicRating: z.number().min(0).max(100),
        fanInterest: z.number().min(0).max(100),
        prestige: z.number().min(0).max(100),
        historicalPrestige: z.number().min(0).max(100),
        expectedWins: z.number().min(0).max(40),
        blueBloodTier: z.enum(["Blue Blood", "Elite", "Upper Tier", "Mid Tier", "Lower Tier"]),
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

const withPersistence = async <T>(taskName: string, callback: () => Promise<T>): Promise<T | null> => {
  if (!persistenceEnabled) return null;
  try {
    return await callback();
  } catch (error) {
    app.log.warn({ err: error, taskName }, "Persistence unavailable; continuing in memory mode.");
    return null;
  }
};

const saveLeagueState = async () => {
  await withPersistence("saveLeagueState", async () =>
    prisma.leagueState.upsert({
      where: { id: LEAGUE_STATE_ID },
      update: { universe: universe ?? Prisma.JsonNull, season: activeSeason ?? Prisma.JsonNull },
      create: { id: LEAGUE_STATE_ID, universe: universe ?? Prisma.JsonNull, season: activeSeason ?? Prisma.JsonNull },
    }),
  );
};

const loadLeagueState = async () => {
  const state = await withPersistence("loadLeagueState", async () => prisma.leagueState.findUnique({ where: { id: LEAGUE_STATE_ID } }));
  if (!state) return;
  universe = (state.universe as UniverseSnapshot | null) ?? null;
  activeSeason = (state.season as ActiveSeasonState | null) ?? null;
};

app.get("/api/health", async () => ({ ok: true, now: new Date().toISOString(), persistenceEnabled }));
app.get("/api/state", async (): Promise<LeagueStateSnapshot> => ({ universe, activeSeason, savedAt: new Date().toISOString() }));

app.post("/api/universe/bootstrap", async (request, reply) => {
  const parsed = bootstrapSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

  const payload = parsed.data as BootstrapUniverseRequest;
  universe = bootstrapUniverse(payload);
  activeSeason = null;

  await withPersistence("upsertTeams", async () =>
    Promise.all(
      universe!.teams.map((team) =>
        prisma.team.upsert({
          where: { id: team.id },
          update: {
            name: team.name,
            conference: team.conference,
            currentPrestige: Math.round(team.prestige),
            historicalRating: Math.round(team.historicalPrestige),
            facilityRating: Math.round(team.facilities),
            nilStrength: Math.round(team.nilStrength),
            rosterTalent: Math.round(team.rosterTalent),
            coachingRating: Math.round(team.coaching),
            defenseDiscipline: Math.round(team.defenseDiscipline),
            tempoControl: Math.round(team.tempoControl),
            boosterBudget: Math.round(team.boosterBudget),
            mediaMarket: Math.round(team.mediaMarket),
            fanIntensity: Math.round(team.fanIntensity),
            arenaCapacity: Math.round(team.arenaCapacity),
            academicRating: Math.round(team.academicRating),
            fanInterest: Math.round(team.fanInterest),
            blueBloodTier: team.blueBloodTier,
          },
          create: {
            id: team.id,
            name: team.name,
            conference: team.conference,
            currentPrestige: Math.round(team.prestige),
            historicalRating: Math.round(team.historicalPrestige),
            facilityRating: Math.round(team.facilities),
            nilStrength: Math.round(team.nilStrength),
            rosterTalent: Math.round(team.rosterTalent),
            coachingRating: Math.round(team.coaching),
            defenseDiscipline: Math.round(team.defenseDiscipline),
            tempoControl: Math.round(team.tempoControl),
            boosterBudget: Math.round(team.boosterBudget),
            mediaMarket: Math.round(team.mediaMarket),
            fanIntensity: Math.round(team.fanIntensity),
            arenaCapacity: Math.round(team.arenaCapacity),
            academicRating: Math.round(team.academicRating),
            fanInterest: Math.round(team.fanInterest),
            blueBloodTier: team.blueBloodTier,
          },
        }),
      ),
    ),
  );

  await saveLeagueState();
  return { universe };
});

app.get("/api/universe", async () => {
  if (universe) return { universe };
  await loadLeagueState();
  if (universe) return { universe };

  const teams = await withPersistence("loadTeams", async () => prisma.team.findMany({ orderBy: [{ conference: "asc" }, { name: "asc" }] }));
  if (!teams || teams.length === 0) return { universe: null };

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
      boosterBudget: team.boosterBudget,
      mediaMarket: team.mediaMarket,
      fanIntensity: team.fanIntensity,
      arenaCapacity: team.arenaCapacity,
      academicRating: team.academicRating,
      fanInterest: team.fanInterest,
      prestige: team.currentPrestige,
      historicalPrestige: team.historicalRating,
      expectedWins: 14,
      blueBloodTier: team.blueBloodTier as "Blue Blood" | "Elite" | "Upper Tier" | "Mid Tier" | "Lower Tier",
    })),
    conferences: [],
  };

  await saveLeagueState();
  return { universe };
});

app.post("/api/season/start", async (request, reply) => {
  const parsed = seasonInputSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

  activeSeason = initializeSeason(parsed.data as SeasonSimulationInput);
  await saveLeagueState();
  return { season: activeSeason };
});

app.get("/api/season", async () => {
  if (!activeSeason) await loadLeagueState();
  return { season: activeSeason };
});

app.post("/api/season/progress", async (request, reply) => {
  const parsed = progressSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

  if (!activeSeason) await loadLeagueState();
  if (!activeSeason) return reply.code(400).send({ error: "No active season. Start one first." });

  activeSeason = simulateSeasonSpan(activeSeason, parsed.data.mode);
  await saveLeagueState();
  return { season: activeSeason };
});

app.post("/api/season/simulate", async (request, reply) => {
  const parsed = seasonInputSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

  return { result: runSeasonSimulation(parsed.data as SeasonSimulationInput) };
});

app.get("/api/offseason", async () => {
  if (!activeSeason) await loadLeagueState();
  return { offseason: activeSeason?.offseason ?? null };
});

app.post("/api/offseason/run", async (_request, reply) => {
  if (!activeSeason) await loadLeagueState();
  if (!activeSeason) return reply.code(400).send({ error: "No active season. Start one first." });
  if (!activeSeason.isComplete) return reply.code(400).send({ error: "Offseason requires a completed season." });

  activeSeason = { ...activeSeason, offseason: runOffseason(activeSeason) };
  await saveLeagueState();
  return { offseason: activeSeason.offseason };
});

const start = async () => {
  try {
    if (!persistenceEnabled) app.log.warn("DATABASE_URL is not set. Running in memory-only mode.");
    await loadLeagueState();
    await app.listen({ host: "0.0.0.0", port: 4000 });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
