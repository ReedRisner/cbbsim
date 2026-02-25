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
  conferenceNames: z.array(z.string().min(2).max(40)).min(0).max(40),
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

  await withPersistence("upsertUniverse", async () => {
    await Promise.all(
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
    );

    if (universe?.conferences?.length) {
      await prisma.conference.deleteMany();
      await prisma.conference.createMany({
        data: universe.conferences.map((conference) => ({
          name: conference.name,
          prestige: Math.round(conference.prestige),
          mediaDealValue: Math.round(conference.mediaDealValue),
          tournamentFormat: "single_elimination",
          autoBidValue: conference.autoBidValue,
          memberCount: conference.teamIds.length,
          tier: conference.tier,
          foundedSeason: 1900,
        })),
      });
    }

    if (universe?.coaches?.length) {
      await prisma.coach.deleteMany();
      await prisma.coach.createMany({
        data: universe.coaches.map((coach) => ({
          firstName: coach.firstName,
          lastName: coach.lastName,
          teamId: coach.teamId,
          role: coach.role,
          age: coach.age,
          offensiveIq: coach.offensiveIq,
          defensiveIq: coach.defensiveIq,
          developmentSkill: coach.developmentSkill,
          recruitingSkill: coach.recruitingSkill,
          charisma: coach.charisma,
          discipline: coach.discipline,
          gameManagement: coach.gameManagement,
          adaptability: coach.adaptability,
          loyalty: coach.loyalty,
          ambition: coach.ambition,
          ethics: coach.ethics,
          salary: 250000 + coach.offensiveIq * 7500,
          contractYearsRemaining: 4,
          careerWins: 0,
          careerLosses: 0,
          tournamentAppearances: 0,
          finalFours: 0,
          championships: 0,
          schemePace: coach.adaptability,
          schemeThreeEmphasis: coach.offensiveIq,
          schemePostUsage: coach.defensiveIq,
          schemePressFrequency: coach.charisma,
          schemeZoneVsMan: coach.defensiveIq,
          schemePnr: coach.offensiveIq,
          schemeTransition: coach.adaptability,
          schemeDefAggression: coach.discipline,
          nbaInterest: Math.round(coach.ambition * 0.7),
        })),
      });
    }

    if (universe?.players?.length) {
      await prisma.player.deleteMany();
      await prisma.player.createMany({
        data: universe.players.map((player) => ({
          firstName: player.firstName,
          lastName: player.lastName,
          teamId: player.teamId,
          position: player.position,
          classYear: player.classYear,
          age: player.age,
          height: player.height,
          weight: player.weight,
          wingspan: player.wingspan,
          hometownState: "NA",
          hometownCity: "NA",
          hsStarRating: Math.max(2, Math.min(5, Math.round((player.overall - 45) / 10))),
          closeShot: player.skills.close_shot,
          midRange: player.skills.mid_range,
          threePoint: player.skills.three_point,
          freeThrow: player.skills.mid_range,
          postMoves: player.skills.post_moves,
          ballHandling: player.skills.ball_handling,
          passing: player.skills.passing,
          offRebounding: player.skills.def_rebounding,
          defRebounding: player.skills.def_rebounding,
          interiorDef: player.skills.interior_def,
          perimeterDef: player.skills.perimeter_def,
          stealAbility: player.skills.perimeter_def,
          shotIq: player.skills.mid_range,
          defIq: player.skills.perimeter_def,
          screenSetting: player.skills.screen_setting,
          offBallMovement: player.skills.off_ball_movement,
          transitionPlay: player.skills.transition_play,
          drawFouls: player.skills.draw_fouls,
          speed: player.skills.speed,
          vertical: player.skills.speed,
          stamina: player.skills.transition_play,
          aggressionOffense: 55,
          aggressionDefense: 52,
          threePointFrequency: 50,
          postUpFrequency: 50,
          transitionPush: 52,
          passFirst: 48,
          flashyPlay: 40,
          foulProne: 45,
          workEthic: 55,
          loyalty: 55,
          ego: 50,
          coachability: 55,
          competitiveness: 56,
          leadership: 50,
          maturity: 52,
          truePotential: player.truePotential,
          potentialVariance: 10,
          injuryProneness: 0.02,
          clutchRating: 50,
          consistency: 55,
          nbaDraftInterest: 40,
          overallRating: player.overall,
          nilValue: player.overall * 1800,
          injuryStatus: "healthy",
          injuryGamesRemaining: 0,
          academicGpa: 3.0,
          eligibilityYearsRemaining: 4,
          portalStatus: "none",
          draftDeclaration: false,
          devCurveType: player.devCurveType,
          createdSeason: new Date().getFullYear(),
        })),
      });
    }

    if (universe?.recruits?.length && prisma.recruit) {
      await prisma.recruit.deleteMany();
      await prisma.recruit.createMany({
        data: universe.recruits.map((recruit) => {
          const [firstName, ...rest] = recruit.name.split(" ");
          return {
            id: recruit.id,
            firstName,
            lastName: rest.join(" ") || "Prospect",
            position: (["PG", "SG", "SF", "PF", "C"] as const)[Math.floor(Math.random() * 5)],
            starRating: recruit.stars,
            compositeScore: recruit.compositeScore,
            hometownState: recruit.region,
            hometownCity: recruit.region,
            scoutedOverall: Math.round((recruit.scoutedMin + recruit.scoutedMax) / 2),
            scoutedPotential: recruit.scoutedMax,
            trueOverall: recruit.trueOverall,
            truePotential: recruit.truePotential,
            recruitType: recruit.recruitType,
            committedTeamId: recruit.committedTeamId || null,
            recruitClassYear: new Date().getFullYear(),
          };
        }),
      });
    }
  });

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
