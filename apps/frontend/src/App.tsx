import { useEffect, useMemo, useState } from "react";
import type { SeasonSimulationResult, TeamProfile, UniverseSnapshot } from "@cbbsim/shared";

type SimulationKnobs = {
  injuryVariance: number;
  chaosFactor: number;
  fatigueImpact: number;
};

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
  const [simulation, setSimulation] = useState<SeasonSimulationResult | null>(null);
  const [knobs, setKnobs] = useState(defaultKnobs);
  const [loadingUniverse, setLoadingUniverse] = useState(false);
  const [runningSeason, setRunningSeason] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamMap = useMemo(
    () => new Map((universe?.teams ?? []).map((team) => [team.id, team])),
    [universe],
  );

  const loadUniverse = async () => {
    setLoadingUniverse(true);
    setError(null);
    try {
      const response = await fetch("/api/universe");
      const data = await response.json();
      setUniverse(data.universe);
    } catch {
      setError("Failed to load universe from API.");
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
      setSimulation(null);
    } catch {
      setError("Failed to generate new universe.");
    } finally {
      setLoadingUniverse(false);
    }
  };

  const runSeason = async () => {
    if (!universe) {
      return;
    }

    setRunningSeason(true);
    setError(null);
    try {
      const response = await fetch("/api/season/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teams: universe.teams,
          ...knobs,
        }),
      });
      const data = await response.json();
      setSimulation(data.result);
    } catch {
      setError("Season simulation failed.");
    } finally {
      setRunningSeason(false);
    }
  };

  const sortedTeams = [...(universe?.teams ?? [])].sort((a, b) => b.prestige - a.prestige);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-court">CBBSIM</p>
          <h1 className="text-3xl font-bold">College Basketball Coach Simulator</h1>
          <p className="text-slate-300">Universe generation, ratings model, and full-season simulation.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            onClick={loadUniverse}
            type="button"
          >
            Reload
          </button>
          <button
            className="rounded-md bg-court px-4 py-2 text-sm font-semibold text-slate-900 hover:brightness-110"
            onClick={generateUniverse}
            type="button"
          >
            {loadingUniverse ? "Generating..." : "Generate Universe"}
          </button>
          <button
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:brightness-110 disabled:opacity-50"
            disabled={!universe || runningSeason}
            onClick={runSeason}
            type="button"
          >
            {runningSeason ? "Simulating..." : "Simulate Full Season"}
          </button>
        </div>
      </header>

      {error ? <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-red-300">{error}</p> : null}

      <section className="mb-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-3">
        <label className="text-sm">
          Injury variance: <span className="font-semibold text-court">{knobs.injuryVariance}</span>
          <input
            className="mt-2 w-full accent-court"
            max={30}
            min={0}
            onChange={(event) => setKnobs((current) => ({ ...current, injuryVariance: Number(event.target.value) }))}
            type="range"
            value={knobs.injuryVariance}
          />
        </label>
        <label className="text-sm">
          Chaos factor: <span className="font-semibold text-court">{knobs.chaosFactor}</span>
          <input
            className="mt-2 w-full accent-court"
            max={30}
            min={0}
            onChange={(event) => setKnobs((current) => ({ ...current, chaosFactor: Number(event.target.value) }))}
            type="range"
            value={knobs.chaosFactor}
          />
        </label>
        <label className="text-sm">
          Fatigue impact: <span className="font-semibold text-court">{knobs.fatigueImpact}</span>
          <input
            className="mt-2 w-full accent-court"
            max={20}
            min={0}
            onChange={(event) => setKnobs((current) => ({ ...current, fatigueImpact: Number(event.target.value) }))}
            type="range"
            value={knobs.fatigueImpact}
          />
        </label>
      </section>

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
          <h2 className="mb-3 text-xl font-semibold">Season Outcome</h2>
          {!simulation ? (
            <p className="text-slate-300">Run a season simulation to populate standings and storylines.</p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-400">Auto-bid Champion</p>
                <p className="font-semibold text-court">{teamMap.get(simulation.autoBidTeamId)?.name ?? simulation.autoBidTeamId}</p>
              </div>

              <div>
                <p className="mb-2 text-sm uppercase tracking-wide text-slate-400">Top 8 Standings</p>
                <ul className="space-y-1 text-sm">
                  {simulation.standings.slice(0, 8).map((entry, index) => (
                    <li className="flex justify-between" key={entry.teamId}>
                      <span>
                        {index + 1}. {teamMap.get(entry.teamId)?.name ?? entry.teamId}
                      </span>
                      <strong>
                        {entry.wins}-{entry.losses}
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-sm uppercase tracking-wide text-slate-400">Storylines</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {simulation.storylines.map((storyline) => (
                    <li key={storyline}>{storyline}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
