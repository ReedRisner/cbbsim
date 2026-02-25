import { existsSync, readFileSync } from "node:fs";
import type {
  BootstrapUniverseRequest,
  ConferenceProfile,
  RecruitProfile,
  TeamProfile,
  UniverseSnapshot,
} from "@cbbsim/shared";

type SeedTeam = {
  team: string;
  abr: string;
  colors: string[];
  conference: string;
  mascot: string;
  roster_talent?: number;
  facilities?: number;
  prestige?: number;
  nil_strength?: number;
  booster_budget?: number;
  media_market?: number;
  fan_intensity?: number;
  arena_capacity?: number;
  academic_rating?: number;
};

type PlayerPosition = "PG" | "SG" | "SF" | "PF" | "C";
type DevelopmentCurve = "early" | "standard" | "late" | "bust" | "freak";

type GeneratedCoach = {
  id: string;
  teamId: string;
  role: "head" | "assistant_oc" | "assistant_dc" | "assistant_recruiting" | "assistant_dev";
  firstName: string;
  lastName: string;
  age: number;
  offensiveIq: number;
  defensiveIq: number;
  developmentSkill: number;
  recruitingSkill: number;
  charisma: number;
  discipline: number;
  gameManagement: number;
  adaptability: number;
  loyalty: number;
  ambition: number;
  ethics: number;
};

type GeneratedPlayer = {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  position: PlayerPosition;
  classYear: "FR" | "SO" | "JR" | "SR";
  age: number;
  height: number;
  weight: number;
  wingspan: number;
  overall: number;
  truePotential: number;
  devCurveType: DevelopmentCurve;
  skills: Record<string, number>;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const normalizeColor = (hex: string) => hex.replace(/^#/, "").toLowerCase();
const sanitizeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const DEFAULT_COLOR = "777777";
const TARGET_TEAM_COUNT = 362;

const firstNames = ["Jay", "Marcus", "Andre", "Dylan", "Cam", "Noah", "Eli", "Roman", "Malik", "Xavier", "Luka", "Hassan"];
const lastNames = ["Turner", "Hill", "Reed", "Collins", "Morgan", "Price", "Evans", "Howard", "Brown", "Davis", "Young", "Foster"];
const positions: PlayerPosition[] = ["PG", "SG", "SF", "PF", "C"];

const seededRating = (seed: SeedTeam, bias: number) => {
  const conferenceBias = ["SEC", "BIG TEN", "BIG 12", "ACC"].includes(seed.conference.toUpperCase()) ? 8 : 0;
  const charBias = seed.abr.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0) % 17;
  return clamp(45 + conferenceBias + charBias + bias, 20, 96);
};

const normalRandom = (mean = 0, stdDev = 1) => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stdDev;
};

const parseSeedTeams = (): SeedTeam[] => {
  const runtimePath = new URL("./data/teams.json", import.meta.url);
  const sourcePath = new URL("../src/data/teams.json", import.meta.url);
  const teamsPath = existsSync(runtimePath) ? runtimePath : sourcePath;
  const file = readFileSync(teamsPath, "utf8");
  const raw = JSON.parse(file);

  if (!Array.isArray(raw)) throw new Error("teams.json must be an array");

  return raw.map((entry, index) => {
    if (
      typeof entry?.team !== "string" ||
      typeof entry?.abr !== "string" ||
      typeof entry?.conference !== "string" ||
      typeof entry?.mascot !== "string" ||
      !Array.isArray(entry?.colors)
    ) {
      throw new Error(`Invalid teams.json entry at index ${index}`);
    }

    const normalizedColors = entry.colors.map((color: unknown) => normalizeColor(String(color))).filter(Boolean);

    return {
      ...entry,
      team: entry.team.trim(),
      abr: entry.abr.trim().toUpperCase(),
      conference: entry.conference.trim(),
      mascot: entry.mascot.trim(),
      colors: normalizedColors.length > 0 ? normalizedColors : [DEFAULT_COLOR],
    } satisfies SeedTeam;
  });
};

const ensureTeamCount = (teams: SeedTeam[]) => {
  if (teams.length === TARGET_TEAM_COUNT) return teams;
  return [...teams]
    .sort((a, b) => a.conference.localeCompare(b.conference) || a.team.localeCompare(b.team))
    .slice(0, TARGET_TEAM_COUNT);
};

const computeFanInterest = (team: TeamProfile) => {
  const recentWinPct = clamp((team.expectedWins / 31) * 100, 10, 90);
  const starPlayerPresence = clamp(team.rosterTalent + (team.nilStrength - 50) * 0.4, 15, 95);
  const rivalryIntensity = 45;
  return clamp(
    Math.round(0.3 * team.prestige + 0.25 * recentWinPct + 0.2 * team.fanIntensity + 0.15 * starPlayerPresence + 0.1 * rivalryIntensity),
    0,
    100,
  );
};

const classifyBlueBloodTier = (currentPrestige: number, historicalPrestige: number, finalFours: number): TeamProfile["blueBloodTier"] => {
  if (historicalPrestige >= 90 && currentPrestige >= 75 && finalFours >= 6) return "Blue Blood";
  if (currentPrestige >= 80 || (historicalPrestige >= 75 && currentPrestige >= 65)) return "Elite";
  if (currentPrestige >= 60) return "Upper Tier";
  if (currentPrestige >= 35) return "Mid Tier";
  return "Lower Tier";
};

const createTeam = (seed: SeedTeam): TeamProfile => {
  const prestige = clamp(seed.prestige ?? seededRating(seed, 1), 0, 100);
  const historicalPrestige = clamp(Math.round(prestige * 0.7 + seededRating(seed, 2) * 0.3), 0, 100);
  const finalFours = clamp(Math.round((historicalPrestige - 45) / 6 + normalRandom(0, 1.2)), 0, 15);

  const team: TeamProfile = {
    id: sanitizeId(seed.abr),
    name: seed.team,
    abr: seed.abr,
    mascot: seed.mascot,
    colors: seed.colors,
    conference: seed.conference,
    rosterTalent: clamp(seed.roster_talent ?? seededRating(seed, -4), 0, 100),
    coaching: seededRating(seed, 0),
    facilities: clamp(seed.facilities ?? seededRating(seed, -1), 0, 100),
    nilStrength: clamp(seed.nil_strength ?? seededRating(seed, 2), 0, 100),
    defenseDiscipline: seededRating(seed, -2),
    tempoControl: seededRating(seed, -3),
    boosterBudget: clamp(seed.booster_budget ?? Math.round(40 + prestige * 2.6), 0, 500),
    mediaMarket: clamp(seed.media_market ?? seededRating(seed, -1), 0, 100),
    fanIntensity: clamp(seed.fan_intensity ?? Math.round(35 + prestige * 0.45), 0, 100),
    arenaCapacity: clamp(seed.arena_capacity ?? Math.round(6500 + prestige * 130), 3500, 26000),
    academicRating: clamp(seed.academic_rating ?? seededRating(seed, -5), 0, 100),
    fanInterest: 50,
    prestige,
    historicalPrestige,
    expectedWins: clamp(Math.round(9 + prestige * 0.18), 8, 29),
    blueBloodTier: classifyBlueBloodTier(prestige, historicalPrestige, finalFours),
  };

  team.fanInterest = computeFanInterest(team);
  return team;
};

const conferenceTier = (name: string): ConferenceProfile["tier"] => {
  const upper = name.toUpperCase();
  if (["SEC", "ACC", "BIG TEN", "BIG 12"].includes(upper)) return "power4";
  if (["AAC", "MOUNTAIN WEST", "WCC", "A-10"].includes(upper)) return "upper_mid";
  if (["MVC", "MAC", "SUN BELT", "CUSA"].includes(upper)) return "mid";
  return "low";
};

const autoBidFromTier = (tier: ConferenceProfile["tier"]) => {
  if (tier === "power4") return 1;
  if (tier === "upper_mid") return 0.7;
  if (tier === "mid") return 0.5;
  return 0.3;
};

const generateConferenceTimeline = () => [clamp(Math.round(normalRandom(58, 14)), 0, 100), clamp(Math.round(normalRandom(55, 14)), 0, 100), clamp(Math.round(normalRandom(52, 14)), 0, 100)];

const buildConferences = (teams: TeamProfile[]): ConferenceProfile[] => {
  const grouped = new Map<string, TeamProfile[]>();
  teams.forEach((team) => {
    const list = grouped.get(team.conference) ?? [];
    list.push(team);
    grouped.set(team.conference, list);
  });

  return [...grouped.entries()].map(([name, members]) => {
    const tier = conferenceTier(name);
    const avgTeamPrestige = members.reduce((sum, team) => sum + team.prestige, 0) / members.length;
    const top5Avg = [...members]
      .sort((a, b) => b.prestige - a.prestige)
      .slice(0, 5)
      .reduce((sum, team) => sum + team.prestige, 0) / Math.min(5, members.length);
    const mediaDealValue = clamp(
      Math.round((members.reduce((sum, team) => sum + team.mediaMarket, 0) / members.length) * (tier === "power4" ? 1.1 : 0.9)),
      15,
      100,
    );
    const historicalWeight = clamp(Math.round(members.reduce((sum, team) => sum + team.historicalPrestige, 0) / members.length), 0, 100);
    const [y0, y1, y2] = generateConferenceTimeline();
    const tournamentSuccess3yr = clamp(Math.round(0.5 * y0 + 0.3 * y1 + 0.2 * y2), 0, 100);

    const prestige = clamp(
      Math.round(0.4 * avgTeamPrestige + 0.25 * top5Avg + 0.15 * tournamentSuccess3yr + 0.1 * mediaDealValue + 0.1 * historicalWeight),
      0,
      100,
    );

    return {
      id: sanitizeId(name),
      name,
      prestige,
      mediaDealValue,
      historicalWeight,
      tournamentSuccess3yr,
      autoBidValue: autoBidFromTier(tier),
      tier,
      teamIds: members.map((team) => team.id),
    };
  });
};

const applyBootstrapFilters = (teams: SeedTeam[], request: BootstrapUniverseRequest) => {
  const selectedConferences = new Set(request.conferenceNames.map((name) => name.trim()).filter(Boolean));
  const conferenceFiltered = selectedConferences.size ? teams.filter((team) => selectedConferences.has(team.conference)) : teams;
  const effectivePool = conferenceFiltered.length > 0 ? conferenceFiltered : teams;

  const byConference = new Map<string, SeedTeam[]>();
  effectivePool.forEach((team) => {
    const list = byConference.get(team.conference) ?? [];
    list.push(team);
    byConference.set(team.conference, list);
  });

  const sliced: SeedTeam[] = [];
  byConference.forEach((conferenceTeams) => sliced.push(...conferenceTeams.slice(0, Math.max(1, request.teamsPerConference))));
  return sliced.length > 0 ? sliced : teams;
};


const ensureConferenceCount = (teams: TeamProfile[], target = 32) => {
  const unique = new Set(teams.map((team) => team.conference));
  if (unique.size >= target) return teams;

  const grouped = new Map<string, TeamProfile[]>();
  teams.forEach((team) => {
    const list = grouped.get(team.conference) ?? [];
    list.push(team);
    grouped.set(team.conference, list);
  });

  let idx = 0;
  while (grouped.size < target) {
    const donor = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    if (!donor || donor[1].length <= 8) break;
    const newConferenceName = idx === 0 ? "Pacific Union" : `Regional Alliance ${idx + 1}`;
    const moved = donor[1].splice(-8, 8);
    moved.forEach((team) => {
      team.conference = newConferenceName;
    });
    grouped.set(newConferenceName, moved);
    idx += 1;
  }

  return teams;
};

const positionWeights: Record<PlayerPosition, Record<string, number>> = {
  PG: { ball_handling: 1.5, passing: 1.3, perimeter_def: 1.2, speed: 1.2, three_point: 1.1, post_moves: 0.2 },
  SG: { three_point: 1.3, off_ball_movement: 1.2, perimeter_def: 1.1, speed: 1.1, post_moves: 0.3 },
  SF: { perimeter_def: 1.2, transition_play: 1.1, draw_fouls: 1.1, three_point: 1.0, post_moves: 0.6 },
  PF: { interior_def: 1.2, def_rebounding: 1.2, screen_setting: 1.1, post_moves: 1.0, three_point: 0.6 },
  C: { interior_def: 1.4, def_rebounding: 1.3, post_moves: 1.2, close_shot: 1.2, ball_handling: 0.2 },
};

export const calculatePlayerOverall = (position: PlayerPosition, attributes: Record<string, number>) => {
  const weights = positionWeights[position];
  const sumWeights = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const total = Object.entries(weights).reduce((sum, [key, weight]) => sum + (attributes[key] ?? 50) * weight, 0);
  return clamp(Math.round(total / sumWeights), 25, 99);
};

const assignDevCurve = (): DevelopmentCurve => {
  const roll = Math.random();
  if (roll < 0.15) return "early";
  if (roll < 0.6) return "standard";
  if (roll < 0.8) return "late";
  if (roll < 0.92) return "bust";
  return "freak";
};

const generatePlayers = (teams: TeamProfile[]) => {
  const players: GeneratedPlayer[] = [];
  teams.forEach((team, teamIndex) => {
    const rosterSize = teamIndex < 188 ? 13 : 12;
    for (let i = 0; i < rosterSize; i += 1) {
      const position = positions[i % positions.length];
      const skills = {
        close_shot: clamp(Math.round(normalRandom(team.rosterTalent, 11)), 25, 99),
        mid_range: clamp(Math.round(normalRandom(team.rosterTalent - 2, 11)), 25, 99),
        three_point: clamp(Math.round(normalRandom(team.rosterTalent - (position === "C" ? 12 : 0), 13)), 20, 99),
        post_moves: clamp(Math.round(normalRandom(team.rosterTalent + (position === "C" ? 8 : 0), 12)), 20, 99),
        ball_handling: clamp(Math.round(normalRandom(team.rosterTalent + (position === "PG" ? 8 : -6), 12)), 20, 99),
        passing: clamp(Math.round(normalRandom(team.rosterTalent + (position === "PG" ? 7 : -3), 11)), 20, 99),
        def_rebounding: clamp(Math.round(normalRandom(team.rosterTalent + (position === "C" ? 7 : 0), 12)), 20, 99),
        interior_def: clamp(Math.round(normalRandom(team.defenseDiscipline + (position === "C" ? 10 : -5), 12)), 20, 99),
        perimeter_def: clamp(Math.round(normalRandom(team.defenseDiscipline + (position === "PG" ? 8 : 0), 12)), 20, 99),
        speed: clamp(Math.round(normalRandom(68 + (position === "PG" ? 8 : -2), 9)), 30, 99),
        off_ball_movement: clamp(Math.round(normalRandom(team.tempoControl, 11)), 20, 99),
        transition_play: clamp(Math.round(normalRandom(team.tempoControl, 11)), 20, 99),
        draw_fouls: clamp(Math.round(normalRandom(team.rosterTalent - 2, 12)), 20, 99),
        screen_setting: clamp(Math.round(normalRandom(team.rosterTalent + (position === "PF" || position === "C" ? 6 : -4), 10)), 20, 99),
      };
      const overall = calculatePlayerOverall(position, skills);
      const truePotential = clamp(Math.round(overall + normalRandom(10, 8)), overall + 1, 99);

      players.push({
        id: `p-${team.id}-${i + 1}`,
        teamId: team.id,
        firstName: firstNames[(teamIndex + i) % firstNames.length],
        lastName: lastNames[(teamIndex * 2 + i) % lastNames.length],
        position,
        classYear: (["FR", "SO", "JR", "SR"] as const)[i % 4],
        age: 18 + (i % 5),
        height: clamp(Math.round(normalRandom(position === "C" ? 83 : position === "PG" ? 74 : 78, 2.4)), 72, 87),
        weight: clamp(Math.round(normalRandom(position === "C" ? 247 : 205, 18)), 160, 285),
        wingspan: clamp(Math.round(normalRandom(position === "C" ? 87 : 79, 2.5)), 74, 92),
        overall,
        truePotential,
        devCurveType: assignDevCurve(),
        skills,
      });
    }
  });
  return players;
};

const generateCoaches = (teams: TeamProfile[]): GeneratedCoach[] => {
  const roles: GeneratedCoach["role"][] = ["head", "assistant_oc", "assistant_dc", "assistant_recruiting", "assistant_dev"];
  const coaches: GeneratedCoach[] = [];
  teams.forEach((team, i) => {
    roles.forEach((role, roleIndex) => {
      coaches.push({
        id: `c-${team.id}-${roleIndex + 1}`,
        teamId: team.id,
        role,
        firstName: firstNames[(i + roleIndex) % firstNames.length],
        lastName: lastNames[(i + roleIndex * 3) % lastNames.length],
        age: clamp(Math.round(normalRandom(role === "head" ? 52 : 38, 7)), 27, 74),
        offensiveIq: clamp(Math.round(normalRandom(team.coaching, 10)), 30, 99),
        defensiveIq: clamp(Math.round(normalRandom(team.defenseDiscipline, 10)), 30, 99),
        developmentSkill: clamp(Math.round(normalRandom(team.coaching, 10)), 30, 99),
        recruitingSkill: clamp(Math.round(normalRandom(team.nilStrength, 12)), 25, 99),
        charisma: clamp(Math.round(normalRandom(team.fanIntensity, 11)), 25, 99),
        discipline: clamp(Math.round(normalRandom(team.defenseDiscipline, 11)), 25, 99),
        gameManagement: clamp(Math.round(normalRandom(team.coaching, 9)), 25, 99),
        adaptability: clamp(Math.round(normalRandom(team.tempoControl, 12)), 25, 99),
        loyalty: clamp(Math.round(normalRandom(60, 18)), 1, 99),
        ambition: clamp(Math.round(normalRandom(57, 17)), 1, 99),
        ethics: clamp(Math.round(normalRandom(64, 16)), 1, 99),
      });
    });
  });
  return coaches;
};

const generateRecruitClass = (count = 500): RecruitProfile[] => {
  const archetypes: RecruitProfile["archetype"][] = ["Creator", "Shooter", "RimProtector", "PointForward", "GlueWing"];
  return Array.from({ length: count }, (_, i) => {
    const trueOverall = clamp(Math.round(normalRandom(68, 12)), 35, 98);
    const truePotential = clamp(Math.round(trueOverall + normalRandom(10, 9)), trueOverall + 1, 99);
    const uncertainty = clamp(Math.round(normalRandom(11, 4)), 3, 24);
    const scoutedOverall = clamp(Math.round(normalRandom(trueOverall, uncertainty)), 25, 99);
    const scoutedPotential = clamp(Math.round(normalRandom(truePotential, uncertainty)), 25, 99);
    const compositeScore = clamp(Math.round(0.4 * scoutedPotential + 0.35 * scoutedOverall + 0.25 * clamp(Math.round(normalRandom(65, 10)), 25, 99)), 25, 99);

    return {
      id: `r-${i + 1}`,
      name: `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`,
      classYear: "FR",
      region: ["Northeast", "Southeast", "Midwest", "Texas", "California", "International"][i % 6],
      archetype: archetypes[i % archetypes.length],
      trueOverall,
      truePotential,
      stars: compositeScore >= 92 ? 5 : compositeScore >= 80 ? 4 : compositeScore >= 65 ? 3 : 2,
      scoutedMin: clamp(scoutedOverall - uncertainty, 20, 99),
      scoutedMax: clamp(scoutedOverall + uncertainty, 20, 99),
      confidence: clamp(100 - uncertainty * 3, 20, 95),
      scoutingUncertainty: uncertainty,
      compositeScore,
      personality: {
        ego: clamp(Math.round(normalRandom(50, 18)), 1, 99),
        loyalty: clamp(Math.round(normalRandom(50, 18)), 1, 99),
        coachability: clamp(Math.round(normalRandom(55, 17)), 1, 99),
        nbaDraftInterest: clamp(Math.round(normalRandom(52, 20)), 1, 99),
        academicFocus: clamp(Math.round(normalRandom(58, 15)), 1, 99),
      },
      recruitType: i % 10 === 0 ? "INTL" : i % 5 === 0 ? "JUCO" : "HS",
      committedTeamId: "",
    };
  });
};

export const bootstrapUniverse = (request: BootstrapUniverseRequest): UniverseSnapshot => {
  const seededTeams = ensureTeamCount(parseSeedTeams());
  const filtered = applyBootstrapFilters(seededTeams, request);
  const teams = ensureConferenceCount(filtered.map((team) => createTeam(team)));
  const coaches = generateCoaches(teams);
  const players = generatePlayers(teams);
  const recruits = generateRecruitClass(500);

  return {
    leagueName: request.leagueName,
    generatedAt: new Date().toISOString(),
    teams,
    conferences: buildConferences(teams),
    players,
    coaches,
    recruits,
  };
};

export const calculateFacilityUpgradeCost = (current: number, target: number) => {
  let total = 0;
  for (let rating = current; rating < target; rating += 1) {
    total += 200_000 * 1.04 ** rating;
  }
  return Math.round(total);
};

export const calculatePrestigeDelta = (input: {
  actualWins: number;
  expectedWins: number;
  tourneyImpact: number;
  recruitingClassRankImpact: number;
  nbaDraftPicksImpact: number;
  mediaBuzz: number;
  facilityBonus: number;
  sanctions: number;
}) => {
  const winImpact = clamp((input.actualWins - input.expectedWins) * 1.5, -8, 8);
  return (
    0.35 * winImpact +
    0.25 * input.tourneyImpact +
    0.15 * input.recruitingClassRankImpact +
    0.1 * input.nbaDraftPicksImpact +
    0.08 * input.mediaBuzz +
    0.07 * input.facilityBonus -
    input.sanctions
  );
};

export const calculatePrestigeDecay = (actualWins: number, expectedWins: number, consecutiveUnderperformYears: number) => {
  const baseDecay = Math.max(0, (expectedWins - actualWins) * 0.8);
  return baseDecay * (1 + 0.15 * Math.max(0, consecutiveUnderperformYears));
};

export const calculateAnnualRevenue = (input: {
  confRevShare: number;
  mediaDealTier: number;
  gameDayRevenue: number;
  arenaCapacity: number;
  attendancePct: number;
  boosterDonations: number;
  fanInterest: number;
  merchRevenue: number;
  currentPrestige: number;
  ncaaTourneyPayout: number;
  tourneyRoundsWon: number;
}) =>
  input.confRevShare * input.mediaDealTier +
  input.gameDayRevenue * input.arenaCapacity * input.attendancePct +
  input.boosterDonations * (input.fanInterest / 100) +
  input.merchRevenue * (input.currentPrestige / 100) +
  input.ncaaTourneyPayout * input.tourneyRoundsWon;
