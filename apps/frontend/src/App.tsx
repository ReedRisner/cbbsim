import { useEffect, useMemo, useState } from "react";
import type { ActiveSeasonState, TeamProfile, UniverseSnapshot } from "@cbbsim/shared";

type SimulationKnobs = {
  injuryVariance: number;
  chaosFactor: number;
  fatigueImpact: number;
};

type View = "dashboard" | "team" | "standings" | "games";

const defaultConferences = ["Atlantic", "Central", "Pacific", "Metro"];

const defaultKnobs: SimulationKnobs = {
  injuryVariance: 8,
  chaosFactor: 6,
  fatigueImpact: 4,
};

const ratingCell = (value: number) => (
  <span className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-court">{value}</span>
);

export default function App() {
  const [universe, setUniverse] = useState<UniverseSnapshot | null>(null);
  const [season, setSeason] = useState<ActiveSeasonState | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [view, setView] = useState<View>("dashboard");
  const [knobs, setKnobs] = useState(defaultKnobs);
  const [loadingUniverse, setLoadingUniverse] = useState(false);
  const [runningSeason, setRunningSeason] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamMap = useMemo(
    () => new Map((universe?.teams ?? []).map((team) => [team.id, team])),
    [universe],
  );

  const selectedTeam = selectedTeamId ? teamMap.get(selectedTeamId) ?? null : null;

  const loadUniverse = async () => {
    setLoadingUniverse(true);
    setError(null);
    try {
      const [universeResponse, seasonResponse] = await Promise.all([fetch("/api/universe"), fetch("/api/season")]);
      const universeData = await universeResponse.json();
      const seasonData = await seasonResponse.json();
      setUniverse(universeData.universe);
      setSeason(seasonData.season);
      setSelectedTeamId(universeData.universe?.teams?.[0]?.id ?? "");
    } catch {
      setError("Failed to load saved league state.");
    } finally {
      setLoadingUniverse(false);
    }
  };

  useEffect(() => {
    void loadUniverse();
  }, []);

  const generateUniverse = async () => {
    setLoadingUniverse(true);
    setError(null);
    try {
      const response = await fetch("/api/universe/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueName: "National College Basketball Association",
          conferenceNames: defaultConferences,
          teamsPerConference: 10,
        }),
      });
      const data = await response.json();
      setUniverse(data.universe);
      setSeason(null);
      setSelectedTeamId(data.universe?.teams?.[0]?.id ?? "");
    } catch {
      setError("Failed to generate new universe.");
    } finally {
      setLoadingUniverse(false);
    }
  };

  const startSeason = async () => {
    if (!universe) {
      return;
    }

    setRunningSeason(true);
    setError(null);
    try {
      const response = await fetch("/api/season/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams: universe.teams, ...knobs }),
      });
      const data = await response.json();
      setSeason(data.season);
      setView("dashboard");
    } catch {
      setError("Season initialization failed.");
    } finally {
      setRunningSeason(false);
    }
  };

  const progressSeason = async (mode: "day" | "week" | "season") => {
    if (!season) {
      return;
    }

    setRunningSeason(true);
    setError(null);
    try {
      const response = await fetch("/api/season/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await response.json();
      setSeason(data.season);
    } catch {
      setError("Season simulation step failed.");
    } finally {
      setRunningSeason(false);
    }
  };

  const sortedTeams = [...(universe?.teams ?? [])].sort((a, b) => b.prestige - a.prestige);
  const selectedRecord = season?.standings.find((record) => record.teamId === selectedTeamId);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-court">CBBSIM</p>
          <h1 className="text-3xl font-bold">College Basketball Coach Simulator</h1>
          <p className="text-slate-300">Phase 1 vertical slice: universe + schedule + day/week/season + postseason.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800" onClick={loadUniverse} type="button">
            {loadingUniverse ? "Loading..." : "Reload State"}
          </button>
          <button className="rounded-md bg-court px-4 py-2 text-sm font-semibold text-slate-900 hover:brightness-110" onClick={generateUniverse} type="button">
            Generate Universe
          </button>
          <button className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:brightness-110 disabled:opacity-50" disabled={!universe || runningSeason} onClick={startSeason} type="button">
            Start Season
          </button>
          <button className="rounded-md bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-900 disabled:opacity-50" disabled={!season || season.isComplete || runningSeason} onClick={() => progressSeason("day")} type="button">
            Sim Day
          </button>
          <button className="rounded-md bg-indigo-500 px-3 py-2 text-xs font-semibold text-slate-900 disabled:opacity-50" disabled={!season || season.isComplete || runningSeason} onClick={() => progressSeason("week")} type="button">
            Sim Week
          </button>
          <button className="rounded-md bg-fuchsia-500 px-3 py-2 text-xs font-semibold text-slate-900 disabled:opacity-50" disabled={!season || season.isComplete || runningSeason} onClick={() => progressSeason("season")} type="button">
            Sim Season
          </button>
        </div>
      </header>

      {error ? <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-red-300">{error}</p> : null}

      <section className="mb-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-3">
        <label className="text-sm">
          Injury variance: <span className="font-semibold text-court">{knobs.injuryVariance}</span>
          <input className="mt-2 w-full accent-court" max={30} min={0} onChange={(event) => setKnobs((current) => ({ ...current, injuryVariance: Number(event.target.value) }))} type="range" value={knobs.injuryVariance} />
        </label>
        <label className="text-sm">
          Chaos factor: <span className="font-semibold text-court">{knobs.chaosFactor}</span>
          <input className="mt-2 w-full accent-court" max={30} min={0} onChange={(event) => setKnobs((current) => ({ ...current, chaosFactor: Number(event.target.value) }))} type="range" value={knobs.chaosFactor} />
        </label>
        <label className="text-sm">
          Fatigue impact: <span className="font-semibold text-court">{knobs.fatigueImpact}</span>
          <input className="mt-2 w-full accent-court" max={20} min={0} onChange={(event) => setKnobs((current) => ({ ...current, fatigueImpact: Number(event.target.value) }))} type="range" value={knobs.fatigueImpact} />
        </label>
      </section>

      <section className="mb-4 flex flex-wrap gap-2">
        {(["dashboard", "team", "standings", "games"] as View[]).map((tab) => (
          <button
            className={`rounded-md px-3 py-2 text-sm capitalize ${view === tab ? "bg-court text-slate-900" : "bg-slate-800 text-slate-200"}`}
            key={tab}
            onClick={() => setView(tab)}
            type="button"
          >
            {tab === "team" ? "Team Profile" : tab === "games" ? "Game Log" : tab}
          </button>
        ))}
      </section>

      {view === "dashboard" ? (
        <section className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="mb-3 text-xl font-semibold">Program Database</h2>
            {!universe ? (
              <p className="text-slate-300">No universe loaded. Click Generate Universe.</p>
            ) : (
              <div className="max-h-[540px] overflow-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-950">
                    <tr>
                      <th className="py-2">Team</th>
                      <th>Conf</th>
                      <th>Prestige</th>
                      <th>Roster</th>
                      <th>Coach</th>
                      <th>NIL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeams.map((team: TeamProfile) => (
                      <tr className="border-t border-slate-800" key={team.id}>
                        <td className="py-2 pr-2">{team.name}</td>
                        <td className="text-slate-300">{team.conference}</td>
                        <td>{ratingCell(team.prestige)}</td>
                        <td>{ratingCell(team.rosterTalent)}</td>
                        <td>{ratingCell(team.coaching)}</td>
                        <td>{ratingCell(team.nilStrength)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="mb-3 text-xl font-semibold">Season Control Center</h2>
            {!season ? (
              <p className="text-slate-300">No active season. Click Start Season after generating/loading a universe.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <p>Current day: <strong className="text-court">{season.currentDay}</strong></p>
                <p>Completed games: <strong>{season.completedGames.length}</strong> / {season.schedule.length}</p>
                <p>Status: <strong className={season.isComplete ? "text-emerald-400" : "text-amber-300"}>{season.isComplete ? "Postseason Ready" : "Regular Season In Progress"}</strong></p>
                {season.bracket ? (
                  <>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Postseason Champion</p>
                    <p className="text-lg font-semibold text-court">{teamMap.get(season.bracket.championTeamId)?.name ?? season.bracket.championTeamId}</p>
                  </>
                ) : null}
              </div>
            )}
          </article>
        </section>
      ) : null}

      {view === "team" ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-xl font-semibold">Team Profile</h2>
            <select className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm" onChange={(event) => setSelectedTeamId(event.target.value)} value={selectedTeamId}>
              {(universe?.teams ?? []).map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          {!selectedTeam ? (
            <p className="text-slate-300">Generate/load a universe to inspect a team.</p>
          ) : (
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>Conference: <strong>{selectedTeam.conference}</strong></p>
              <p>Prestige: <strong>{selectedTeam.prestige}</strong></p>
              <p>Roster Talent: <strong>{selectedTeam.rosterTalent}</strong></p>
              <p>Coaching: <strong>{selectedTeam.coaching}</strong></p>
              <p>Facilities: <strong>{selectedTeam.facilities}</strong></p>
              <p>NIL Strength: <strong>{selectedTeam.nilStrength}</strong></p>
              <p>Defense Discipline: <strong>{selectedTeam.defenseDiscipline}</strong></p>
              <p>Tempo Control: <strong>{selectedTeam.tempoControl}</strong></p>
              {selectedRecord ? <p className="md:col-span-2">Season Record: <strong>{selectedRecord.wins}-{selectedRecord.losses}</strong> (Conf {selectedRecord.conferenceWins}-{selectedRecord.conferenceLosses}) | Rank #{selectedRecord.rank} | NET {selectedRecord.netComposite.toFixed(1)} | Poll {selectedRecord.pollScore.toFixed(1)}</p> : null}
            </div>
          )}
        </section>
      ) : null}

      {view === "standings" ? (
        <section className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="mb-3 text-xl font-semibold">Standings & Rankings</h2>
            {!season ? (
              <p className="text-slate-300">No season data.</p>
            ) : (
              <ol className="space-y-1 text-sm">
                {season.standings.map((entry, index) => (
                  <li className="flex justify-between border-b border-slate-800 py-1" key={entry.teamId}>
                    <span>{index + 1}. {teamMap.get(entry.teamId)?.name ?? entry.teamId}</span>
                    <strong>#{entry.rank} {entry.wins}-{entry.losses} | NET {entry.netComposite.toFixed(1)} | Poll {entry.pollScore.toFixed(1)}</strong>
                  </li>
                ))}
              </ol>
            )}
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="mb-3 text-xl font-semibold">Postseason Bracket</h2>
            {!season?.bracket ? (
              <p className="text-slate-300">Complete the regular season to seed the top-8 conference tournament.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {season.bracket.matchups.map((matchup) => (
                  <div className="rounded border border-slate-800 p-2" key={`${matchup.round}-${matchup.homeTeamId}-${matchup.awayTeamId}`}>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{matchup.round}</p>
                    <p>#{matchup.homeSeed} {teamMap.get(matchup.homeTeamId)?.name ?? matchup.homeTeamId} {matchup.homeScore}</p>
                    <p>#{matchup.awaySeed} {teamMap.get(matchup.awayTeamId)?.name ?? matchup.awayTeamId} {matchup.awayScore}</p>
                    <p className="font-semibold text-court">Winner: {teamMap.get(matchup.winnerTeamId)?.name ?? matchup.winnerTeamId}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      ) : null}

      {view === "games" ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="mb-3 text-xl font-semibold">Game Log</h2>
          {!season ? (
            <p className="text-slate-300">No games simulated yet.</p>
          ) : (
            <div className="max-h-[540px] overflow-auto text-sm">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-950">
                  <tr>
                    <th className="py-2">Day</th>
                    <th>Matchup</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {[...season.completedGames].reverse().map((game) => (
                    <tr className="border-t border-slate-800" key={game.gameId}>
                      <td className="py-2">{game.day}</td>
                      <td>{teamMap.get(game.awayTeamId)?.name ?? game.awayTeamId} @ {teamMap.get(game.homeTeamId)?.name ?? game.homeTeamId}</td>
                      <td>{game.awayScore}-{game.homeScore}</td>
                      <td>
                        <span className="font-semibold text-court">{teamMap.get(game.winnerTeamId)?.name ?? game.winnerTeamId}</span>
                        {game.upset ? <span className="ml-2 text-amber-300">Upset</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
