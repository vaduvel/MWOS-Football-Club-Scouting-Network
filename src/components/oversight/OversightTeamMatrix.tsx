import type { OversightTeamSnapshot } from '../../lib/oversightDomain';

function readinessMeta(readiness: OversightTeamSnapshot['readiness']) {
  if (readiness === 'action') {
    return {
      label: 'Action needed',
    };
  }

  if (readiness === 'watch') {
    return {
      label: 'Watch',
    };
  }

  return {
    label: 'Ready',
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
    <section className="mwos-card-tone-report rounded-[28px] border p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
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
              className="mwos-subcard mwos-subcard-report p-5"
            >
              <div className="mwos-subcard-head">
                <div>
                  <p className="mwos-subcard-title mt-0 text-lg">{team.teamName}</p>
                  <p className="mwos-subcard-meta mt-2">
                    {team.coachCount === null ? 'Leadership read-only view' : `${team.coachCount} coach${team.coachCount === 1 ? '' : 'es'} assigned`}
                  </p>
                </div>
                <div className="mwos-subcard-badges">
                  <span className={`mwos-pill ${
                    team.readiness === 'action'
                      ? 'mwos-pill-danger'
                      : team.readiness === 'watch'
                        ? 'mwos-pill-alert'
                        : 'mwos-pill-success'
                  }`}>
                    {readiness.label}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="mwos-subcard mwos-subcard-training p-4">
                  <p className="mwos-subcard-kicker">Training</p>
                  <p className="mwos-subcard-title mt-2">{trainingMeta(team.trainingStatus)}</p>
                  <p className="mwos-subcard-copy mt-2">{team.trainingHeadline}</p>
                </div>
                <div className="mwos-subcard mwos-subcard-transport p-4">
                  <p className="mwos-subcard-kicker">Transport</p>
                  <p className="mwos-subcard-title mt-2">{transportMeta(team.nextTransportStatus)}</p>
                  <p className="mwos-subcard-copy mt-2">{team.nextTransportLabel}</p>
                </div>
              </div>

              {team.issues.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {team.issues.map((issue) => (
                    <span
                      key={`${team.teamId}-${issue.title}`}
                      className={`mwos-pill ${
                        issue.severity === 'high'
                          ? 'mwos-pill-danger'
                          : 'mwos-pill-alert'
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
