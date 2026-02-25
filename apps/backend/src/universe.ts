import { existsSync, readFileSync } from "node:fs";
import type { BootstrapUniverseRequest, ConferenceProfile, TeamProfile, UniverseSnapshot } from "@cbbsim/shared";

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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const normalizeColor = (hex: string) => hex.replace(/^#/, "").toLowerCase();
const sanitizeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const DEFAULT_COLOR = "777777";

const seededRating = (seed: SeedTeam, bias: number) => {
  const conferenceBias = ["SEC", "BIG TEN", "BIG 12", "ACC"].includes(seed.conference.toUpperCase()) ? 8 : 0;
  const charBias = seed.abr.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0) % 17;
  return clamp(45 + conferenceBias + charBias + bias, 20, 96);
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

const computeFanInterest = (team: TeamProfile) => {
  const recentWinPct = clamp((team.expectedWins / 31) * 100, 10, 90);
  const starPlayerPresence = clamp(team.rosterTalent + (team.nilStrength - 50) * 0.4, 15, 95);
  const rivalryIntensity = 45;
  return clamp(
    Math.round(
      0.3 * team.prestige + 0.25 * recentWinPct + 0.2 * team.fanIntensity + 0.15 * starPlayerPresence + 0.1 * rivalryIntensity,
    ),
    0,
    100,
  );
};

const classifyBlueBloodTier = (currentPrestige: number, historicalPrestige: number): TeamProfile["blueBloodTier"] => {
  if (historicalPrestige >= 90 && currentPrestige >= 75) return "Blue Blood";
  if (currentPrestige >= 80 || (historicalPrestige >= 75 && currentPrestige >= 65)) return "Elite";
  if (currentPrestige >= 60) return "Upper Tier";
  if (currentPrestige >= 35) return "Mid Tier";
  return "Lower Tier";
};

const createTeam = (seed: SeedTeam): TeamProfile => {
  const prestige = clamp(seed.prestige ?? seededRating(seed, 1), 0, 100);
  const historicalPrestige = clamp(Math.round(prestige * 0.7 + seededRating(seed, 2) * 0.3), 0, 100);

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
    blueBloodTier: classifyBlueBloodTier(prestige, historicalPrestige),
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
    const tournamentSuccess3yr = clamp(Math.round(avgTeamPrestige * 0.75 + (tier === "power4" ? 18 : 4)), 0, 100);

    const prestige = clamp(
      Math.round(
        0.4 * avgTeamPrestige + 0.25 * top5Avg + 0.15 * tournamentSuccess3yr + 0.1 * mediaDealValue + 0.1 * historicalWeight,
      ),
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

export const bootstrapUniverse = (request: BootstrapUniverseRequest): UniverseSnapshot => {
  const seededTeams = parseSeedTeams();
  const filtered = applyBootstrapFilters(seededTeams, request);
  const teams = filtered.map((team) => createTeam(team));

  return {
    leagueName: request.leagueName,
    generatedAt: new Date().toISOString(),
    teams,
    conferences: buildConferences(teams),
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
