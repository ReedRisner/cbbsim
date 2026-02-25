import type { ActiveSeasonState, OffseasonState, PortalPlayer, RecruitProfile, TeamOffseasonSummary, TeamProfile } from "@cbbsim/shared";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

const firstNames = ["Jay", "Marcus", "Andre", "Dylan", "Cam", "Noah", "Eli", "Roman", "Malik", "Xavier", "Luka", "Hassan"];
const lastNames = ["Turner", "Hill", "Reed", "Collins", "Morgan", "Price", "Evans", "Howard", "Brown", "Davis", "Young", "Foster"];
const archetypes: RecruitProfile["archetype"][] = ["Creator", "Shooter", "RimProtector", "PointForward", "GlueWing"];
const regionPool = ["Northeast", "Mid-Atlantic", "Southeast", "Midwest", "Texas", "California", "Illinois", "Indiana", "Georgia", "International"];

const normalRandom = (mean = 0, stdDev = 1) => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stdDev;
};

const recruitDistribution = (teamCount: number) => ({
  hs: clamp(Math.round(450 + teamCount * 0.08), 450, 550),
  juco: clamp(Math.round(100 + teamCount * 0.06), 100, 150),
  intl: clamp(Math.round(20 + teamCount * 0.04), 20, 40),
});

const scoutingUncertainty = (recruitType: RecruitProfile["recruitType"], archetype: RecruitProfile["archetype"], investment: number) => {
  const positionFactor = archetype === "RimProtector" ? 1.4 : archetype === "GlueWing" ? 1.2 : 1.0;
  const geographyFactor = recruitType === "INTL" ? 1.5 : 1.0;
  return clamp(15 * (1 - investment) * positionFactor * geographyFactor, 3, 24);
};

const calculateComposite = (scoutedOverall: number, scoutedPotential: number, recruitType: RecruitProfile["recruitType"]) => {
  const measurables = clamp(65 + normalRandom(0, recruitType === "INTL" ? 12 : 8), 35, 99);
  const eventPerformance = clamp(63 + normalRandom(0, 10), 30, 98);
  return clamp(0.4 * scoutedPotential + 0.35 * scoutedOverall + 0.15 * measurables + 0.1 * eventPerformance, 25, 99);
};

const starsFromComposite = (composite: number): 2 | 3 | 4 | 5 => {
  if (composite >= 92) return 5;
  if (composite >= 80) return 4;
  if (composite >= 65) return 3;
  return 2;
};

const developmentPitch = (team: TeamProfile) => {
  const draftPicksLast5yr = clamp(Math.round((team.prestige - 40) / 10), 0, 8);
  const lotteryPicksLast5yr = clamp(Math.round((team.prestige - 60) / 15), 0, 5);
  return draftPicksLast5yr * 3 + lotteryPicksLast5yr * 5 + team.coaching * 0.2;
};

const annualNilBudget = (team: TeamProfile, donorMomentum: number, boosterFatigue: number) => {
  const boosterBase = team.boosterBudget * 100_000;
  const mediaMarketMult = 0.6 + (team.mediaMarket / 100) * 0.8;
  const prestigeMult = 0.5 + (team.prestige / 100) * 1;
  const fanInterestMult = 0.7 + (team.fanInterest / 100) * 0.6;
  const gross = boosterBase * mediaMarketMult * prestigeMult * fanInterestMult * (1 + donorMomentum);
  return Math.round(gross * (1 - boosterFatigue));
};

const recruitingInterest = (team: TeamProfile, recruit: RecruitProfile, relationship: number, nilOffer: number) => {
  const normalizedNil = Math.log(nilOffer / 20_000 + 1) * 15;
  const proximity = recruit.region === "International" ? 35 : team.conference.includes("10") ? 65 : 50;
  const playStyleFit = recruit.archetype === "RimProtector" ? team.defenseDiscipline : team.tempoControl;

  const weights = {
    prestige: 0.16 + recruit.personality.ego / 1000,
    proximity: 0.1 + recruit.personality.loyalty / 1200,
    pt: 0.12,
    nil: 0.16 + recruit.personality.ego / 900,
    coach: 0.1,
    style: 0.09,
    dev: 0.09 + recruit.personality.nbaDraftInterest / 1000,
    win: 0.08,
    relation: 0.08 + recruit.personality.loyalty / 1300,
    pro: 0.12 + recruit.personality.nbaDraftInterest / 900,
  };

  const total =
    weights.prestige * team.prestige +
    weights.proximity * proximity +
    weights.pt * clamp((13 - 10) * 10, 15, 95) +
    weights.nil * normalizedNil +
    weights.coach * team.coaching +
    weights.style * playStyleFit +
    weights.dev * team.coaching +
    weights.win * clamp(team.expectedWins * 3.2, 10, 95) +
    weights.relation * relationship +
    weights.pro * developmentPitch(team);

  return clamp(total / 1.3, 0, 100);
};

const visitBoost = (team: TeamProfile, late = false, official = true) => {
  const base = 5 + team.facilities / 20 + team.fanInterest / 25 + team.coaching / 30;
  const visit = official ? base : base * 0.4;
  return late ? visit * 1.3 : visit;
};

const createRecruit = (index: number, recruitType: RecruitProfile["recruitType"]): RecruitProfile => {
  const archetype = archetypes[index % archetypes.length];
  const investment = clamp(Math.random() * 0.85, 0, 0.85);
  const uncertainty = scoutingUncertainty(recruitType, archetype, investment);
  const baselinePotential = recruitType === "JUCO" ? 64 : recruitType === "INTL" ? 67 : 61;
  const truePotential = clamp(Math.round(normalRandom(baselinePotential, 12)), 35, 98);
  const trueOverall = clamp(Math.round(truePotential - 7 + normalRandom(0, recruitType === "JUCO" ? 4 : 7)), 32, 95);
  const scoutedOverall = clamp(trueOverall + normalRandom(0, uncertainty), 25, 99);
  const scoutedPotential = clamp(truePotential + normalRandom(0, uncertainty * 1.5), 25, 99);
  const compositeScore = calculateComposite(scoutedOverall, scoutedPotential, recruitType);

  return {
    id: `r-${recruitType.toLowerCase()}-${index + 1}`,
    name: `${firstNames[index % firstNames.length]} ${lastNames[(index * 3) % lastNames.length]}`,
    classYear: recruitType === "JUCO" ? "JUCO" : "FR",
    region: recruitType === "INTL" ? "International" : regionPool[index % (regionPool.length - 1)],
    archetype,
    trueOverall,
    truePotential,
    stars: starsFromComposite(compositeScore),
    scoutedMin: Math.round(clamp(scoutedPotential - uncertainty, 20, 99)),
    scoutedMax: Math.round(clamp(scoutedPotential + uncertainty, 20, 99)),
    confidence: clamp(1 - uncertainty / 25, 0.2, 0.95),
    scoutingUncertainty: uncertainty,
    compositeScore,
    personality: {
      ego: clamp(Math.round(normalRandom(55, 20)), 5, 99),
      loyalty: clamp(Math.round(normalRandom(recruitType === "JUCO" ? 35 : 58, 20)), 1, 99),
      coachability: clamp(Math.round(normalRandom(58, 18)), 5, 99),
      nbaDraftInterest: clamp(Math.round(normalRandom(recruitType === "INTL" ? 70 : 55, 18)), 1, 99),
      academicFocus: clamp(Math.round(normalRandom(recruitType === "JUCO" ? 40 : 56, 20)), 1, 99),
    },
    recruitType,
    committedTeamId: "",
  };
};

const portalEntryProbability = (team: TeamProfile, playerOverall: number) => {
  const expectedMinutes = clamp(18 + (playerOverall - 60) * 0.5, 8, 36);
  const actualMinutes = clamp(normalRandom(expectedMinutes - 4, 6), 0, 40);
  const ptFrustration = Math.max(0, ((expectedMinutes - actualMinutes) / Math.max(1, expectedMinutes)) * 0.3);
  const nilGap = Math.max(0, ((playerOverall * 1800 - playerOverall * 1300) / Math.max(1, playerOverall * 1800)) * 0.15);
  const coachChangePush = Math.random() < 0.08 ? 0.25 : Math.random() < 0.14 ? 0.1 : 0;
  const sanctionsPush = 0;
  const ego = clamp(Math.round(normalRandom(52, 18)), 1, 99);
  const maturity = clamp(Math.round(normalRandom(52, 18)), 1, 99);
  const loyalty = clamp(Math.round(normalRandom(52, 20)), 1, 99);
  const personalityFactor = (ego / 100) * 0.1 - (maturity / 100) * 0.05;
  const loyaltyAnchor = (loyalty / 100) * 0.2;

  return clamp(0.05 + ptFrustration + nilGap + coachChangePush + sanctionsPush + personalityFactor - loyaltyAnchor + (65 - team.prestige) / 600, 0.01, 0.9);
};

const portalPlayerValue = (playerOverall: number, oldTeamSos: number, fitScore: number) => {
  const contextDiscount = Math.max(0, (oldTeamSos - 50) * -0.3);
  const systemBonus = fitScore * 3;
  return clamp(playerOverall - contextDiscount + systemBonus, 20, 99);
};

export const runOffseason = (state: ActiveSeasonState): OffseasonState => {
  const teams = state.teams;
  const seasonYear = new Date().getFullYear();
  const rosterTarget = 13;

  const summaries = new Map<string, TeamOffseasonSummary>();
  const openScholarships = new Map<string, number>();
  const nilRemaining = new Map<string, number>();

  teams.forEach((team) => {
    const boosterFatigue = clamp(Math.max(0, Math.random() * 0.24 - 0.04), 0, 0.2);
    const donorMomentum = team.expectedWins >= 21 ? 0.25 : team.expectedWins >= 18 ? 0.15 : -0.1;
    const nilStart = annualNilBudget(team, donorMomentum, boosterFatigue);
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
      boosterFatigue,
    });
    openScholarships.set(team.id, scholarshipsOpen);
    nilRemaining.set(team.id, nilStart);
  });

  const counts = recruitDistribution(teams.length);
  const generatedRecruits = [
    ...Array.from({ length: counts.hs }, (_, i) => createRecruit(i, "HS")),
    ...Array.from({ length: counts.juco }, (_, i) => createRecruit(i, "JUCO")),
    ...Array.from({ length: counts.intl }, (_, i) => createRecruit(i, "INTL")),
  ];

  const signedRecruits: RecruitProfile[] = [];
  const decommitments: Array<{ recruitId: string; fromTeamId: string }> = [];

  generatedRecruits
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .forEach((recruit) => {
      const rankedTeams = [...teams]
        .map((team) => {
          const baseOffer = recruit.stars * 35_000 + recruit.trueOverall * 1200;
          const softCap = Math.round((summaries.get(team.id)?.nilBudgetStart ?? 0) * 0.25);
          const offer = Math.min(softCap, Math.round(baseOffer * (0.9 + Math.random() * 0.8)));
          const relationship = clamp(Math.round(40 + Math.random() * 45 + visitBoost(team, Math.random() > 0.7)), 0, 100);
          const interest = recruitingInterest(team, recruit, relationship, offer);
          return { team, interest, offer };
        })
        .sort((a, b) => b.interest - a.interest)
        .slice(0, 5);

      const top = rankedTeams[0];
      const second = rankedTeams[1];
      if (!top || !second) return;

      const commitProb = sigmoid((top.interest - 80) / 5) * sigmoid((top.interest - second.interest - 15) / 5);
      const chosen = top.interest > 80 && top.interest - second.interest >= 15 && Math.random() < commitProb ? top : rankedTeams.find((t) => t.interest > 60) ?? top;
      const scholarships = openScholarships.get(chosen.team.id) ?? 0;
      const budgetRemaining = nilRemaining.get(chosen.team.id) ?? 0;
      if (scholarships <= 0 || budgetRemaining < chosen.offer) return;

      recruit.committedTeamId = chosen.team.id;
      signedRecruits.push(recruit);
      nilRemaining.set(chosen.team.id, budgetRemaining - chosen.offer);
      openScholarships.set(chosen.team.id, scholarships - 1);

      const summary = summaries.get(chosen.team.id);
      if (summary) {
        summary.recruitsSigned += 1;
        summary.nilSpent += chosen.offer;
        summary.projectedRosterCount += 1;
      }

      const decommitProb = 0.03 * (1 - recruit.personality.loyalty / 100) * (Math.random() < 0.06 ? 5 : 1);
      if (Math.random() < decommitProb) {
        decommitments.push({ recruitId: recruit.id, fromTeamId: chosen.team.id });
        recruit.committedTeamId = "";
      }
    });

  const portalEntrants: PortalPlayer[] = [];
  teams.forEach((team, index) => {
    const maxCandidates = clamp(Math.round(1 + (65 - team.coaching) / 20), 1, 3);
    for (let i = 0; i < maxCandidates; i += 1) {
      const overall = clamp(Math.round(normalRandom(72, 9)), 55, 95);
      if (Math.random() > portalEntryProbability(team, overall)) continue;

      const marketValue = portalPlayerValue(overall, clamp(Math.round(team.prestige + normalRandom(0, 8)), 20, 95), (team.tempoControl + team.defenseDiscipline) / 200);
      const tamperingRisk = (team.coaching < 40 ? 0.15 : 0) + (team.nilStrength > 80 ? 0.1 : 0) + (marketValue > 85 ? 0.1 : 0);

      portalEntrants.push({
        id: `p-${team.id}-${i + 1}`,
        name: `${firstNames[(index + i) % firstNames.length]} ${lastNames[(index + i * 2) % lastNames.length]}`,
        originTeamId: team.id,
        overall,
        marketValue,
        yearsRemaining: Math.random() < 0.65 ? 2 : 1,
        tamperingRisk: clamp(tamperingRisk, 0.01, 0.8),
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
    .sort((a, b) => b.marketValue - a.marketValue)
    .forEach((portalPlayer) => {
      const options = teams
        .filter((team) => team.id !== portalPlayer.originTeamId)
        .map((team) => {
          const scholarshipsOpen = openScholarships.get(team.id) ?? 0;
          if (scholarshipsOpen <= 0) return null;
          const fit = clamp((team.tempoControl + team.defenseDiscipline) / 200, 0.2, 0.95);
          const utility = portalPlayerValue(portalPlayer.overall, team.prestige, fit) * 0.45 + team.nilStrength * 0.25 + team.prestige * 0.2 + team.coaching * 0.1;
          return { team, utility };
        })
        .filter((entry): entry is { team: TeamProfile; utility: number } => Boolean(entry))
        .sort((a, b) => b.utility - a.utility)
        .slice(0, 4);

      const destination = options[0]?.team;
      if (!destination) return;

      const nilCost = Math.round(80_000 + portalPlayer.marketValue * 2200);
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
        if (Math.random() < portalPlayer.tamperingRisk * 0.05) summary.tamperingIncidents += 1;
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
    decommitments,
    completedAt: new Date().toISOString(),
  };
};
