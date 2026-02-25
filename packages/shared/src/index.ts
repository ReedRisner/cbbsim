export type TeamIdentity = {
  id: string;
  name: string;
  conference: string;
  abr: string;
  mascot: string;
  colors: string[];
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

export type RecruitProfile = {
  id: string;
  name: string;
  classYear: "FR" | "JUCO";
  region: string;
  archetype: "Creator" | "Shooter" | "RimProtector" | "PointForward" | "GlueWing";
  trueOverall: number;
  truePotential: number;
  stars: 2 | 3 | 4 | 5;
  scoutedMin: number;
  scoutedMax: number;
  confidence: number;
  committedTeamId: string;
};

export type PortalPlayer = {
  id: string;
  name: string;
  originTeamId: string;
  overall: number;
  yearsRemaining: number;
  tamperingRisk: number;
  destinationTeamId: string;
};

export type TeamOffseasonSummary = {
  teamId: string;
  scholarshipsOpen: number;
  recruitsSigned: number;
  portalAdditions: number;
  portalLosses: number;
  nilBudgetStart: number;
  nilSpent: number;
  nilBudgetEnd: number;
  tamperingIncidents: number;
  projectedRosterCount: number;
};

export type OffseasonState = {
  seasonYear: number;
  generatedRecruits: RecruitProfile[];
  signedRecruits: RecruitProfile[];
  portalEntrants: PortalPlayer[];
  portalCommitments: PortalPlayer[];
  teamSummaries: TeamOffseasonSummary[];
  completedAt: string;
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
  offseason: OffseasonState | null;
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
