import type { OversightTeamSnapshot } from '../../lib/oversightDomain';

function readinessMeta(readiness: OversightTeamSnapshot['readiness']) {
  if (readiness === 'action') {
    return {
      label: 'Action needed',
      className: 'bg-red-100 text-red-700',
    };
  }

  if (readiness === 'watch') {
    return {
      label: 'Watch',
      className: 'bg-amber-100 text-amber-700',
    };
  }

  return {
    label: 'Ready',
    className: 'bg-emerald-100 text-emerald-700',
  };
}

function trainingMeta(status: OversightTeamSnapshot['trainingStatus']) {
  switch (status) {
    case 'published':
      return 'Published';
    case 'updated':
      return 'Updated';
    case 'draft':
      return 'Draft';
    default:
      return 'Missing';
  }
}

function transportMeta(status: OversightTeamSnapshot['nextTransportStatus']) {
  if (status === 'none') return 'No trip';
  return status[0]?.toUpperCase() + status.slice(1);
}

export default function OversightTeamMatrix({ teams }: { teams: OversightTeamSnapshot[] }) {
  return (
    <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[var(--color-dark)]">Team readiness</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
            A club-wide look at who is staffed, who has a current-week plan, and where transport follow-up is needed.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {teams.map((team) => {
          const readiness = readinessMeta(team.readiness);
          return (
            <article
              key={team.teamId}
              className="rounded-[24px] border border-[var(--color-mid)]/12 bg-[var(--color-light)]/58 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-[var(--color-dark)]">{team.teamName}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-mid)]">
                    {team.coachCount === null ? 'Leadership read-only view' : `${team.coachCount} coach${team.coachCount === 1 ? '' : 'es'} assigned`}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${readiness.className}`}>
                  {readiness.label}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Training</p>
                  <p className="mt-2 text-sm font-black text-[var(--color-dark)]">{trainingMeta(team.trainingStatus)}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{team.trainingHeadline}</p>
                </div>
                <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Transport</p>
                  <p className="mt-2 text-sm font-black text-[var(--color-dark)]">{transportMeta(team.nextTransportStatus)}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{team.nextTransportLabel}</p>
                </div>
              </div>

              {team.issues.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {team.issues.map((issue) => (
                    <span
                      key={`${team.teamId}-${issue.title}`}
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                        issue.severity === 'high'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {issue.title}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
