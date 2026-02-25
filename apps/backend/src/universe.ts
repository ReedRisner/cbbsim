import type { BootstrapUniverseRequest, TeamProfile, UniverseSnapshot } from "@cbbsim/shared";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const makeTeamName = (conference: string, index: number) => {
  const mascotPool = ["Hawks", "Bears", "Titans", "Storm", "Cougars", "Phoenix", "Wolves", "Royals"];
  const city = conference.split(" ")[0];
  const mascot = mascotPool[index % mascotPool.length];
  return `${city} ${mascot}`;
};

const createTeam = (conference: string, index: number): TeamProfile => {
  const baseline = 35 + Math.floor(Math.random() * 45);

  return {
    id: `${conference.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`,
    name: makeTeamName(conference, index),
    conference,
    rosterTalent: clamp(baseline + Math.floor(Math.random() * 18) - 6, 20, 96),
    coaching: clamp(baseline + Math.floor(Math.random() * 20) - 8, 20, 98),
    facilities: clamp(baseline + Math.floor(Math.random() * 16) - 10, 15, 95),
    nilStrength: clamp(baseline + Math.floor(Math.random() * 22) - 12, 10, 99),
    defenseDiscipline: clamp(baseline + Math.floor(Math.random() * 14) - 7, 20, 95),
    tempoControl: clamp(baseline + Math.floor(Math.random() * 14) - 7, 20, 95),
    prestige: clamp(baseline + Math.floor(Math.random() * 26) - 12, 15, 99),
    expectedWins: 14,
  };
};

export const bootstrapUniverse = (request: BootstrapUniverseRequest): UniverseSnapshot => {
  const teams: TeamProfile[] = [];

  request.conferenceNames.forEach((conferenceName) => {
    for (let index = 0; index < request.teamsPerConference; index += 1) {
      teams.push(createTeam(conferenceName, index));
    }
  });

  return {
    leagueName: request.leagueName,
    generatedAt: new Date().toISOString(),
    teams,
  };
};
