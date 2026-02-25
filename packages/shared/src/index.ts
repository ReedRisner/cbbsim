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
  day: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string;
  upset: boolean;
  conferenceGame: boolean;
};

export type TeamSeasonRecord = {
  teamId: string;
  wins: number;
  losses: number;
  conferenceWins: number;
  conferenceLosses: number;
  netRating: number;
  netComposite: number;
  pollScore: number;
  rank: number;
};

export type SeasonSimulationInput = {
  teams: TeamProfile[];
  injuryVariance: number;
  chaosFactor: number;
  fatigueImpact: number;
};

export type BracketMatchup = {
  round: "Quarterfinal" | "Semifinal" | "Final";
  homeTeamId: string;
  awayTeamId: string;
  winnerTeamId: string;
  homeSeed: number;
  awaySeed: number;
  homeScore: number;
  awayScore: number;
};

export type PostseasonBracket = {
  championTeamId: string;
  matchups: BracketMatchup[];
};

export type ActiveSeasonState = {
  teams: TeamProfile[];
  settings: Omit<SeasonSimulationInput, "teams">;
  schedule: Array<{
    gameId: string;
    day: number;
    homeTeamId: string;
    awayTeamId: string;
    conferenceGame: boolean;
  }>;
  nextGameIndex: number;
  currentDay: number;
  gamesPerDay: number;
  standings: TeamSeasonRecord[];
  completedGames: GameResult[];
  isComplete: boolean;
  bubbleTeams: string[];
  autoBidTeamId: string;
  storylines: string[];
  bracket: PostseasonBracket | null;
};

export type LeagueStateSnapshot = {
  universe: UniverseSnapshot | null;
  activeSeason: ActiveSeasonState | null;
  savedAt: string;
};

export type SeasonSimulationResult = {
  records: TeamSeasonRecord[];
  standings: TeamSeasonRecord[];
  games: GameResult[];
  bubbleTeams: string[];
  autoBidTeamId: string;
  storylines: string[];
  bracket: PostseasonBracket | null;
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
