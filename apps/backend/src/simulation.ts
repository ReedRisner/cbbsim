import type {
  GameResult,
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
  const games: Array<{ homeTeam: TeamProfile; awayTeam: TeamProfile; conferenceGame: boolean }> = [];

  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      const first = teams[i];
      const second = teams[j];
      const sameConference = first.conference === second.conference;
      games.push({ homeTeam: first, awayTeam: second, conferenceGame: sameConference });
      games.push({ homeTeam: second, awayTeam: first, conferenceGame: sameConference });
    }
  }

  return games;
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
    });
  });

  return records;
};

export const runSeasonSimulation = (input: SeasonSimulationInput): SeasonSimulationResult => {
  const records = initializeRecords(input.teams);
  const schedule = buildRoundRobinSchedule(input.teams);
  const games: GameResult[] = [];

  schedule.forEach((game, index) => {
    const fatigueDrift = (Math.random() - 0.5) * input.fatigueImpact;
    const injuryDriftHome = (Math.random() - 0.5) * input.injuryVariance;
    const injuryDriftAway = (Math.random() - 0.5) * input.injuryVariance;
    const chaosDrift = (Math.random() - 0.5) * input.chaosFactor;

    const homeStrength = gameStrength(game.homeTeam, 2 + fatigueDrift + injuryDriftHome + chaosDrift);
    const awayStrength = gameStrength(game.awayTeam, fatigueDrift + injuryDriftAway - chaosDrift);

    const homeScore = expectedPoints(homeStrength, awayStrength);
    const awayScore = expectedPoints(awayStrength, homeStrength);

    const finalHome = homeScore === awayScore ? homeScore + 1 : homeScore;
    const winnerTeamId = finalHome > awayScore ? game.homeTeam.id : game.awayTeam.id;
    const loserTeamId = winnerTeamId === game.homeTeam.id ? game.awayTeam.id : game.homeTeam.id;

    const winnerRecord = records.get(winnerTeamId);
    const loserRecord = records.get(loserTeamId);

    if (!winnerRecord || !loserRecord) {
      return;
    }

    winnerRecord.wins += 1;
    loserRecord.losses += 1;

    if (game.conferenceGame) {
      winnerRecord.conferenceWins += 1;
      loserRecord.conferenceLosses += 1;
    }

    winnerRecord.netRating += Math.abs(finalHome - awayScore) * 0.35;
    loserRecord.netRating -= Math.abs(finalHome - awayScore) * 0.3;

    const upset = performanceScore(game.homeTeam) < performanceScore(game.awayTeam)
      ? winnerTeamId === game.homeTeam.id
      : winnerTeamId === game.awayTeam.id;

    games.push({
      gameId: `g-${index + 1}`,
      homeTeamId: game.homeTeam.id,
      awayTeamId: game.awayTeam.id,
      homeScore: finalHome,
      awayScore,
      winnerTeamId,
      upset,
    });
  });

  const finalRecords = [...records.values()].sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return b.netRating - a.netRating;
  });

  const standings = [...finalRecords];
  const autoBidTeamId = standings[0]?.teamId ?? "";
  const bubbleTeams = standings.slice(5, 11).map((record) => record.teamId);
  const biggestUpset = games.find((game) => game.upset);

  return {
    records: finalRecords,
    standings,
    games,
    bubbleTeams,
    autoBidTeamId,
    storylines: [
      `${standings[0]?.teamId ?? "Unknown"} finished first and secured the league auto-bid.`,
      biggestUpset
        ? `Major upset: ${biggestUpset.winnerTeamId} beat ${biggestUpset.homeTeamId === biggestUpset.winnerTeamId ? biggestUpset.awayTeamId : biggestUpset.homeTeamId}.`
        : "No major upsets defined by the model.",
      `${bubbleTeams.length} teams are projected to fight on Selection Sunday's bubble.`,
    ],
  };
};
