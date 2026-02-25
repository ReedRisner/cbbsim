export type TeamIdentity = {
  id: string;
  name: string;
  conference: string;
};

export type TeamRatings = {
  rosterTalent: number;
  coaching: number;
  facilities: number;
  nilStrength: number;
  defenseDiscipline: number;
  tempoControl: number;
};

export type TeamProfile = TeamIdentity &
  TeamRatings & {
    prestige: number;
    expectedWins: number;
  };

export type GameResult = {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string;
  upset: boolean;
};

export type TeamSeasonRecord = {
  teamId: string;
  wins: number;
  losses: number;
  conferenceWins: number;
  conferenceLosses: number;
  netRating: number;
};

export type SeasonSimulationInput = {
  teams: TeamProfile[];
  injuryVariance: number;
  chaosFactor: number;
  fatigueImpact: number;
};

export type SeasonSimulationResult = {
  records: TeamSeasonRecord[];
  standings: TeamSeasonRecord[];
  games: GameResult[];
  bubbleTeams: string[];
  autoBidTeamId: string;
  storylines: string[];
};

export type BootstrapUniverseRequest = {
  leagueName: string;
  conferenceNames: string[];
  teamsPerConference: number;
};

export type UniverseSnapshot = {
  leagueName: string;
  generatedAt: string;
  teams: TeamProfile[];
};
