import { existsSync, readFileSync } from "node:fs";
import type { BootstrapUniverseRequest, TeamProfile, UniverseSnapshot } from "@cbbsim/shared";

type SeedTeam = {
  team: string;
  abr: string;
  colors: string[];
  conference: string;
  mascot: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeColor = (hex: string) => hex.replace(/^#/, "").toLowerCase();
const sanitizeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const DEFAULT_COLOR = "777777";

const parseSeedTeams = (): SeedTeam[] => {
  const runtimePath = new URL("./data/teams.json", import.meta.url);
  const sourcePath = new URL("../src/data/teams.json", import.meta.url);
  const teamsPath = existsSync(runtimePath) ? runtimePath : sourcePath;
  const file = readFileSync(teamsPath, "utf8");
  const raw = JSON.parse(file);

  if (!Array.isArray(raw)) {
    throw new Error("teams.json must be an array");
  }

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

    const normalizedColors = entry.colors
      .map((color: unknown) => normalizeColor(String(color)))
      .filter((color: string) => color.length > 0);

    return {
      team: entry.team.trim(),
      abr: entry.abr.trim().toUpperCase(),
      conference: entry.conference.trim(),
      mascot: entry.mascot.trim(),
      colors: normalizedColors.length > 0 ? normalizedColors : [DEFAULT_COLOR],
    } satisfies SeedTeam;
  });
};

const seededRating = (seed: SeedTeam, bias: number) => {
  const conferenceBias = seed.conference === "ACC" ? 8 : 0;
  const charBias = seed.abr.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0) % 17;
  return clamp(45 + conferenceBias + charBias + bias, 30, 96);
};

const createTeam = (seed: SeedTeam): TeamProfile => ({
  id: sanitizeId(seed.abr),
  name: seed.team,
  abr: seed.abr,
  mascot: seed.mascot,
  colors: seed.colors,
  conference: seed.conference,
  rosterTalent: seededRating(seed, -4),
  coaching: seededRating(seed, 0),
  facilities: seededRating(seed, -1),
  nilStrength: seededRating(seed, 2),
  defenseDiscipline: seededRating(seed, -2),
  tempoControl: seededRating(seed, -3),
  prestige: seededRating(seed, 1),
  expectedWins: seed.conference === "ACC" ? 18 : 15,
});

const applyBootstrapFilters = (teams: SeedTeam[], request: BootstrapUniverseRequest) => {
  const selectedConferences = new Set(request.conferenceNames.map((name) => name.trim()).filter(Boolean));
  const conferenceFiltered = selectedConferences.size
    ? teams.filter((team) => selectedConferences.has(team.conference))
    : teams;
  const effectivePool = conferenceFiltered.length > 0 ? conferenceFiltered : teams;

  const byConference = new Map<string, SeedTeam[]>();
  effectivePool.forEach((team) => {
    const list = byConference.get(team.conference) ?? [];
    list.push(team);
    byConference.set(team.conference, list);
  });

  const sliced: SeedTeam[] = [];
  byConference.forEach((conferenceTeams) => {
    sliced.push(...conferenceTeams.slice(0, Math.max(1, request.teamsPerConference)));
  });

  return sliced.length > 0 ? sliced : teams;
};

export const bootstrapUniverse = (request: BootstrapUniverseRequest): UniverseSnapshot => {
  const seededTeams = parseSeedTeams();
  const filtered = applyBootstrapFilters(seededTeams, request);

  return {
    leagueName: request.leagueName,
    generatedAt: new Date().toISOString(),
    teams: filtered.map((team) => createTeam(team)),
  };
};
