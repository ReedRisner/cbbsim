import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import type { BootstrapUniverseRequest, SeasonSimulationInput, UniverseSnapshot } from "@cbbsim/shared";
import { z } from "zod";
import { runSeasonSimulation } from "./simulation.js";
import { bootstrapUniverse } from "./universe.js";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

let universe: UniverseSnapshot | null = null;

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

app.get("/api/health", async () => ({ ok: true, now: new Date().toISOString() }));

app.post("/api/universe/bootstrap", async (request, reply) => {
  const parsed = bootstrapSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.flatten() });
  }

  const payload = parsed.data as BootstrapUniverseRequest;
  universe = bootstrapUniverse(payload);

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

  return { universe };
});

app.get("/api/universe", async () => {
  if (universe) {
    return { universe };
  }

  const teams = await prisma.team.findMany({ orderBy: [{ conference: "asc" }, { name: "asc" }] });
  if (teams.length === 0) {
    return { universe: null };
  }

  return {
    universe: {
      leagueName: "Recovered League",
      generatedAt: new Date().toISOString(),
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        conference: team.conference,
        rosterTalent: team.rosterTalent,
        coaching: team.coachingRating,
        facilities: team.facilityRating,
        nilStrength: team.nilStrength,
        defenseDiscipline: team.defenseDiscipline,
        tempoControl: team.tempoControl,
        prestige: team.currentPrestige,
        expectedWins: 14,
      })),
    },
  };
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

const start = async () => {
  try {
    await app.listen({ host: "0.0.0.0", port: 4000 });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
