import type {
  ActiveSeasonState,
  BracketMatchup,
  GameResult,
  PostseasonBracket,
  SeasonSimulationInput,
  SeasonSimulationResult,
  TeamProfile,
  TeamSeasonRecord,
} from "@cbbsim/shared";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const performanceScore = (team: TeamProfile) =>
  team.rosterTalent * 0.34 +
  team.coaching * 0.24 +
  team.defenseDiscipline * 0.12 +
  team.tempoControl * 0.1 +
  team.nilStrength * 0.1 +
  team.facilities * 0.1;

const gameStrength = (team: TeamProfile, drift: number) => performanceScore(team) + drift;

const expectedPoints = (attackStrength: number, defenseStrength: number) => {
  const base = 58 + attackStrength * 0.34 - defenseStrength * 0.18;
  return clamp(Math.round(base), 50, 96);
};

const buildRoundRobinSchedule = (teams: TeamProfile[]) => {
  const schedule: ActiveSeasonState["schedule"] = [];
  let gameId = 1;
  let day = 1;

  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      const first = teams[i];
      const second = teams[j];
      const sameConference = first.conference === second.conference;

      schedule.push({
        gameId: `g-${gameId}`,
        day,
        homeTeamId: first.id,
        awayTeamId: second.id,
        conferenceGame: sameConference,
      });
      gameId += 1;
      day += 1;

      schedule.push({
        gameId: `g-${gameId}`,
        day,
        homeTeamId: second.id,
        awayTeamId: first.id,
        conferenceGame: sameConference,
      });
      gameId += 1;
      day += 1;
    }
  }

  return schedule;
};

const initializeRecords = (teams: TeamProfile[]): Map<string, TeamSeasonRecord> => {
  const records = new Map<string, TeamSeasonRecord>();

  teams.forEach((team) => {
    records.set(team.id, {
      teamId: team.id,
      wins: 0,
      losses: 0,
      conferenceWins: 0,
      conferenceLosses: 0,
      netRating: 0,
      netComposite: 0,
      pollScore: 0,
      rank: 0,
    });
  });

  return records;
};

const sortRecords = (records: TeamSeasonRecord[]) =>
  [...records].sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return b.netRating - a.netRating;
  });

const applyRankings = (records: TeamSeasonRecord[]) => {
  const ranked = sortRecords(records);
  const maxWins = Math.max(...ranked.map((record) => record.wins), 1);

  return ranked.map((record, index) => {
    const winScore = (record.wins / maxWins) * 100;
    const netScore = clamp(50 + record.netRating, 0, 100);
    const netComposite = Number((winScore * 0.6 + netScore * 0.4).toFixed(1));
    const pollScore = Number((winScore * 0.7 + netComposite * 0.3).toFixed(1));

    return {
      ...record,
      netComposite,
      pollScore,
      rank: index + 1,
    };
  });
};

const simulateMatchup = (
  homeTeam: TeamProfile,
  awayTeam: TeamProfile,
  settings: ActiveSeasonState["settings"],
) => {
  const fatigueDrift = (Math.random() - 0.5) * settings.fatigueImpact;
  const injuryDriftHome = (Math.random() - 0.5) * settings.injuryVariance;
  const injuryDriftAway = (Math.random() - 0.5) * settings.injuryVariance;
  const chaosDrift = (Math.random() - 0.5) * settings.chaosFactor;

  const homeStrength = gameStrength(homeTeam, 2 + fatigueDrift + injuryDriftHome + chaosDrift);
  const awayStrength = gameStrength(awayTeam, fatigueDrift + injuryDriftAway - chaosDrift);

  const homeScore = expectedPoints(homeStrength, awayStrength);
  const awayScore = expectedPoints(awayStrength, homeStrength);
  const finalHome = homeScore === awayScore ? homeScore + 1 : homeScore;

  return {
    homeScore: finalHome,
    awayScore,
    winnerTeamId: finalHome > awayScore ? homeTeam.id : awayTeam.id,
  };
};

const buildStorylines = (standings: TeamSeasonRecord[], games: GameResult[]) => {
  const bubbleTeams = standings.slice(5, 11).map((record) => record.teamId);
  const biggestUpset = games.find((game) => game.upset);

  return {
    autoBidTeamId: standings[0]?.teamId ?? "",
    bubbleTeams,
    storylines: [
      `${standings[0]?.teamId ?? "Unknown"} finished first and secured the league auto-bid.`,
      biggestUpset
        ? `Major upset: ${biggestUpset.winnerTeamId} beat ${biggestUpset.homeTeamId === biggestUpset.winnerTeamId ? biggestUpset.awayTeamId : biggestUpset.homeTeamId}.`
        : "No major upsets defined by the model.",
      `${bubbleTeams.length} teams are projected to fight on Selection Sunday's bubble.`,
    ],
  };
};

const createBracket = (
  standings: TeamSeasonRecord[],
  teamMap: Map<string, TeamProfile>,
  settings: ActiveSeasonState["settings"],
): PostseasonBracket | null => {
  const seeded = standings.slice(0, 8).map((record, index) => ({ ...record, seed: index + 1 }));
  if (seeded.length < 8) {
    return null;
  }

  const matchup = (homeSeedEntry: (typeof seeded)[number], awaySeedEntry: (typeof seeded)[number], round: BracketMatchup["round"]) => {
    const homeTeam = teamMap.get(homeSeedEntry.teamId);
    const awayTeam = teamMap.get(awaySeedEntry.teamId);

    if (!homeTeam || !awayTeam) {
      return null;
    }

    const result = simulateMatchup(homeTeam, awayTeam, settings);
    return {
      round,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      winnerTeamId: result.winnerTeamId,
      homeSeed: homeSeedEntry.seed,
      awaySeed: awaySeedEntry.seed,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
    } satisfies BracketMatchup;
  };

  const quarterfinals = [
    matchup(seeded[0], seeded[7], "Quarterfinal"),
    matchup(seeded[3], seeded[4], "Quarterfinal"),
    matchup(seeded[1], seeded[6], "Quarterfinal"),
    matchup(seeded[2], seeded[5], "Quarterfinal"),
  ].filter((item): item is BracketMatchup => Boolean(item));

  if (quarterfinals.length !== 4) {
    return null;
  }

  const qfWinners = quarterfinals.map((item, index) => ({ teamId: item.winnerTeamId, seed: index + 1 }));
  const semifinals = [
    matchup(qfWinners[0], qfWinners[1], "Semifinal"),
    matchup(qfWinners[2], qfWinners[3], "Semifinal"),
  ].filter((item): item is BracketMatchup => Boolean(item));

  if (semifinals.length !== 2) {
    return null;
  }

  const sfWinners = semifinals.map((item, index) => ({ teamId: item.winnerTeamId, seed: index + 1 }));
  const final = matchup(sfWinners[0], sfWinners[1], "Final");
  if (!final) {
    return null;
  }

  return {
    championTeamId: final.winnerTeamId,
    matchups: [...quarterfinals, ...semifinals, final],
  };
};

const finalizeIfComplete = (state: ActiveSeasonState): ActiveSeasonState => {
  const allGamesComplete = state.nextGameIndex >= state.schedule.length;
  if (!allGamesComplete) {
    return state;
  }

  const standings = applyRankings(state.standings);
  const storyData = buildStorylines(standings, state.completedGames);
  const bracket = createBracket(standings, new Map(state.teams.map((team) => [team.id, team])), state.settings);

  return {
    ...state,
    standings,
    ...storyData,
    bracket,
    isComplete: true,
  };
};

export const initializeSeason = (input: SeasonSimulationInput): ActiveSeasonState => {
  const standings = applyRankings([...initializeRecords(input.teams).values()]);
  const schedule = buildRoundRobinSchedule(input.teams);

  return {
    teams: input.teams,
    settings: {
      injuryVariance: input.injuryVariance,
      chaosFactor: input.chaosFactor,
      fatigueImpact: input.fatigueImpact,
    },
    schedule,
    nextGameIndex: 0,
    currentDay: 1,
    gamesPerDay: Math.max(1, Math.floor(input.teams.length / 2)),
    standings,
    completedGames: [],
    isComplete: false,
    bubbleTeams: [],
    autoBidTeamId: "",
    storylines: [],
    bracket: null,
  };
};

export const simulateSeasonSpan = (state: ActiveSeasonState, mode: "day" | "week" | "season") => {
  const updatedState: ActiveSeasonState = {
    ...state,
    standings: state.standings.map((record) => ({ ...record })),
    completedGames: [...state.completedGames],
  };
  const teamMap = new Map(updatedState.teams.map((team) => [team.id, team]));
  const recordMap = new Map(updatedState.standings.map((record) => [record.teamId, record]));

  const dayLimit =
    mode === "day"
      ? 1
      : mode === "week"
        ? 7
        : Number.POSITIVE_INFINITY;

  const startingDay = updatedState.schedule[updatedState.nextGameIndex]?.day ?? updatedState.currentDay;
  const maxDay = startingDay + dayLimit - 1;

  while (updatedState.nextGameIndex < updatedState.schedule.length) {
    const scheduled = updatedState.schedule[updatedState.nextGameIndex];
    if (scheduled.day > maxDay) {
      break;
    }

    const homeTeam = teamMap.get(scheduled.homeTeamId);
    const awayTeam = teamMap.get(scheduled.awayTeamId);
    if (!homeTeam || !awayTeam) {
      updatedState.nextGameIndex += 1;
      continue;
    }

    const outcome = simulateMatchup(homeTeam, awayTeam, updatedState.settings);
    const winnerRecord = recordMap.get(outcome.winnerTeamId);
    const loserTeamId = outcome.winnerTeamId === homeTeam.id ? awayTeam.id : homeTeam.id;
    const loserRecord = recordMap.get(loserTeamId);

    if (!winnerRecord || !loserRecord) {
      updatedState.nextGameIndex += 1;
      continue;
    }

    winnerRecord.wins += 1;
    loserRecord.losses += 1;

    if (scheduled.conferenceGame) {
      winnerRecord.conferenceWins += 1;
      loserRecord.conferenceLosses += 1;
    }

    const margin = Math.abs(outcome.homeScore - outcome.awayScore);
    winnerRecord.netRating += margin * 0.35;
    loserRecord.netRating -= margin * 0.3;

    const upset = performanceScore(homeTeam) < performanceScore(awayTeam)
      ? outcome.winnerTeamId === homeTeam.id
      : outcome.winnerTeamId === awayTeam.id;

    updatedState.completedGames.push({
      gameId: scheduled.gameId,
      day: scheduled.day,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeScore: outcome.homeScore,
      awayScore: outcome.awayScore,
      winnerTeamId: outcome.winnerTeamId,
      upset,
      conferenceGame: scheduled.conferenceGame,
    });

    updatedState.nextGameIndex += 1;
    updatedState.currentDay = scheduled.day;
  }

  updatedState.standings = applyRankings([...recordMap.values()]);
  return finalizeIfComplete(updatedState);
};

export const runSeasonSimulation = (input: SeasonSimulationInput): SeasonSimulationResult => {
  const completed = simulateSeasonSpan(initializeSeason(input), "season");

  return {
    records: completed.standings,
    standings: completed.standings,
    games: completed.completedGames,
    bubbleTeams: completed.bubbleTeams,
    autoBidTeamId: completed.autoBidTeamId,
    storylines: completed.storylines,
    bracket: completed.bracket,
  };
};
