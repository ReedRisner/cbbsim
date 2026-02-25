import type {
  ActiveSeasonState,
  OffseasonState,
  PortalPlayer,
  RecruitProfile,
  TeamOffseasonSummary,
  TeamProfile,
} from "@cbbsim/shared";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const firstNames = ["Jay", "Marcus", "Andre", "Dylan", "Cam", "Noah", "Eli", "Roman", "Malik", "Xavier"];
const lastNames = ["Turner", "Hill", "Reed", "Collins", "Morgan", "Price", "Evans", "Howard", "Brown", "Davis"];
const regions = ["Northeast", "Mid-Atlantic", "Southeast", "Midwest", "Texas", "West"];
const archetypes: RecruitProfile["archetype"][] = ["Creator", "Shooter", "RimProtector", "PointForward", "GlueWing"];

const starFromPotential = (potential: number): 2 | 3 | 4 | 5 => {
  if (potential >= 88) return 5;
  if (potential >= 80) return 4;
  if (potential >= 70) return 3;
  return 2;
};

const teamNilBudget = (team: TeamProfile) => 250_000 + team.nilStrength * 8_000 + team.prestige * 5_000;

const recruitInterestScore = (team: TeamProfile, recruit: RecruitProfile) => {
  const fit = recruit.archetype === "RimProtector" ? team.defenseDiscipline : team.tempoControl;
  const nilLeverage = Math.log1p(team.nilStrength);
  return team.prestige * 0.42 + team.coaching * 0.22 + fit * 0.16 + nilLeverage * 8;
};

const portalUtility = (team: TeamProfile, player: PortalPlayer, scholarshipsOpen: number) => {
  if (scholarshipsOpen <= 0) return -Infinity;
  return player.overall * 0.45 + team.nilStrength * 0.25 + team.prestige * 0.2 + team.coaching * 0.1;
};

const createRecruit = (index: number, teams: TeamProfile[]): RecruitProfile => {
  const truePotential = clamp(Math.round(60 + Math.random() * 35), 55, 96);
  const trueOverall = clamp(Math.round(truePotential - 8 + Math.random() * 10), 50, 92);
  const confidence = clamp(0.35 + Math.random() * 0.6, 0.35, 0.95);
  const uncertainty = Math.round((1 - confidence) * 12);

  return {
    id: `r-${index + 1}`,
    name: `${firstNames[index % firstNames.length]} ${lastNames[(index * 3) % lastNames.length]}`,
    classYear: Math.random() < 0.18 ? "JUCO" : "FR",
    region: regions[index % regions.length],
    archetype: archetypes[index % archetypes.length],
    trueOverall,
    truePotential,
    stars: starFromPotential(truePotential),
    scoutedMin: clamp(truePotential - uncertainty, 45, 99),
    scoutedMax: clamp(truePotential + uncertainty, 45, 99),
    confidence,
    committedTeamId: "",
  };
};

export const runOffseason = (state: ActiveSeasonState): OffseasonState => {
  const teams = state.teams;
  const seasonYear = new Date().getFullYear();
  const rosterTarget = 13;

  const summaries = new Map<string, TeamOffseasonSummary>();
  const openScholarships = new Map<string, number>();
  const nilRemaining = new Map<string, number>();

  teams.forEach((team) => {
    const nilStart = teamNilBudget(team);
    const projectedRoster = clamp(Math.round(9 + team.rosterTalent / 22 + Math.random() * 2), 8, 12);
    const scholarshipsOpen = clamp(rosterTarget - projectedRoster, 1, 5);

    summaries.set(team.id, {
      teamId: team.id,
      scholarshipsOpen,
      recruitsSigned: 0,
      portalAdditions: 0,
      portalLosses: 0,
      nilBudgetStart: nilStart,
      nilSpent: 0,
      nilBudgetEnd: nilStart,
      tamperingIncidents: 0,
      projectedRosterCount: projectedRoster,
    });

    openScholarships.set(team.id, scholarshipsOpen);
    nilRemaining.set(team.id, nilStart);
  });

  const recruitsToGenerate = Math.max(teams.length * 7, 120);
  const generatedRecruits = Array.from({ length: recruitsToGenerate }, (_, index) => createRecruit(index, teams));
  const signedRecruits: RecruitProfile[] = [];

  generatedRecruits
    .sort((a, b) => b.truePotential - a.truePotential)
    .forEach((recruit) => {
      const rankedTeams = [...teams]
        .map((team) => ({ team, score: recruitInterestScore(team, recruit) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const chosen = rankedTeams.find(({ team }) => (openScholarships.get(team.id) ?? 0) > 0 && (nilRemaining.get(team.id) ?? 0) > 10_000);
      if (!chosen) return;

      const nilOffer = Math.round((recruit.stars * 22_000 + recruit.trueOverall * 500) * (1 + Math.random() * 0.5));
      const left = (nilRemaining.get(chosen.team.id) ?? 0) - nilOffer;
      if (left < 0) return;

      recruit.committedTeamId = chosen.team.id;
      signedRecruits.push(recruit);
      nilRemaining.set(chosen.team.id, left);
      openScholarships.set(chosen.team.id, (openScholarships.get(chosen.team.id) ?? 0) - 1);

      const summary = summaries.get(chosen.team.id);
      if (!summary) return;
      summary.recruitsSigned += 1;
      summary.nilSpent += nilOffer;
      summary.projectedRosterCount += 1;
    });

  const portalEntrants: PortalPlayer[] = [];
  teams.forEach((team, index) => {
    const baseChance = 0.12 + (70 - team.coaching) / 250 + (65 - team.prestige) / 300;
    const entrantCount = Math.random() < baseChance ? 1 + (Math.random() < 0.35 ? 1 : 0) : 0;
    for (let i = 0; i < entrantCount; i += 1) {
      portalEntrants.push({
        id: `p-${team.id}-${i + 1}`,
        name: `${firstNames[(index + i) % firstNames.length]} ${lastNames[(index + i * 2) % lastNames.length]}`,
        originTeamId: team.id,
        overall: clamp(Math.round(62 + Math.random() * 24), 58, 92),
        yearsRemaining: Math.random() < 0.65 ? 2 : 1,
        tamperingRisk: clamp(0.08 + Math.random() * 0.45 + team.nilStrength / 500, 0.08, 0.75),
        destinationTeamId: "",
      });

      const originSummary = summaries.get(team.id);
      if (originSummary) {
        originSummary.portalLosses += 1;
        originSummary.projectedRosterCount = Math.max(0, originSummary.projectedRosterCount - 1);
        openScholarships.set(team.id, (openScholarships.get(team.id) ?? 0) + 1);
      }
    }
  });

  const portalCommitments: PortalPlayer[] = [];
  portalEntrants
    .sort((a, b) => b.overall - a.overall)
    .forEach((portalPlayer) => {
      const options = teams
        .filter((team) => team.id !== portalPlayer.originTeamId)
        .map((team) => ({ team, utility: portalUtility(team, portalPlayer, openScholarships.get(team.id) ?? 0) }))
        .filter((option) => Number.isFinite(option.utility))
        .sort((a, b) => b.utility - a.utility)
        .slice(0, 4);

      const destination = options[0]?.team;
      if (!destination) return;

      const nilCost = Math.round(40_000 + portalPlayer.overall * 1300);
      const remaining = (nilRemaining.get(destination.id) ?? 0) - nilCost;
      if (remaining < 0) return;

      portalPlayer.destinationTeamId = destination.id;
      portalCommitments.push(portalPlayer);
      nilRemaining.set(destination.id, remaining);
      openScholarships.set(destination.id, (openScholarships.get(destination.id) ?? 0) - 1);

      const summary = summaries.get(destination.id);
      if (summary) {
        summary.portalAdditions += 1;
        summary.nilSpent += nilCost;
        summary.projectedRosterCount += 1;
        if (Math.random() < portalPlayer.tamperingRisk * 0.4) {
          summary.tamperingIncidents += 1;
        }
      }
    });

  const teamSummaries = [...summaries.values()].map((summary) => ({
    ...summary,
    nilBudgetEnd: Math.max(0, summary.nilBudgetStart - summary.nilSpent),
    projectedRosterCount: clamp(summary.projectedRosterCount, 8, 13),
  }));

  return {
    seasonYear,
    generatedRecruits,
    signedRecruits,
    portalEntrants,
    portalCommitments,
    teamSummaries,
    completedAt: new Date().toISOString(),
  };
};
