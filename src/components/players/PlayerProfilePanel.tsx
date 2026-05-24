import type { ReactNode } from 'react';
import { Activity, ArrowRight, BarChart3, Link2, Sparkles, Star, TrendingUp } from 'lucide-react';

import type { PlayerHubEntry } from '../../lib/data';
import {
  buildRadarChartPoints,
  buildRadarChartPolygon,
  buildTrendChartPath,
  buildTrendChartStops,
} from '../../lib/playerHubDomain';

const PROFILE_METRICS: Array<{ key: keyof PlayerHubEntry['metrics']; label: string }> = [
  { key: 'pace', label: 'Pace' },
  { key: 'strength', label: 'Strength' },
  { key: 'stamina', label: 'Stamina' },
  { key: 'agility', label: 'Agility' },
  { key: 'decision_making', label: 'Decision' },
  { key: 'composure', label: 'Composure' },
];

function formatDisplayDate(value: string) {
  if (!value) return 'No date';

  const normalizedValue = value.includes('T') ? value : `${value}T12:00:00`;
  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
}

type PlayerProfilePanelProps = {
  entry: PlayerHubEntry | null;
  canManageWatchlist: boolean;
  updatingWatchlistKey: string | null;
  onToggleWatchlist: (entry: PlayerHubEntry) => void | Promise<void>;
  onOpenReport: (reportId: string) => void;
};

export default function PlayerProfilePanel({
  entry,
  canManageWatchlist,
  updatingWatchlistKey,
  onToggleWatchlist,
  onOpenReport,
}: PlayerProfilePanelProps) {
  if (!entry) {
    return (
      <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
        <div className="mwos-surface-intro">
          <div className="mwos-surface-intro-icon flex size-10 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
            <UsersFallbackIcon />
          </div>
          <div className="mwos-surface-intro-copy">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
              Player profile
            </p>
            <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">
              Select a tracked player
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
              Open any player card below and we will surface the trend, metrics and latest verdict here.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const trendPath = buildTrendChartPath(entry.trendPoints, 280, 96);
  const trendStops = buildTrendChartStops(entry.trendPoints, 280, 96);
  const radarMetrics = PROFILE_METRICS.map((metric) => ({
    label: metric.label,
    value: entry.metrics[metric.key],
  }));

  return (
    <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
      <div className="flex flex-col gap-4 border-b border-[var(--color-mid)]/12 pb-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--color-primary)]/9 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-primary)]">
              Player profile
            </span>
            <span className="rounded-full bg-[var(--color-primary-deep)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary-deep)]">
              {entry.bestPotential}
            </span>
            {entry.linkedClubPlayerId ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                <Link2 size={12} />
                Club roster linked
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-2xl font-black text-[var(--color-dark)] md:text-[2rem]">
            {entry.name}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
            {entry.clubLabel} • {entry.latestCompetition} • {entry.latestFixture}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
            Last seen {formatDisplayDate(entry.latestReportDate)} across {entry.reportCount} reports and {entry.mentionCount} mentions.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <MetricPill label="Avg score" value={entry.averageScore.toFixed(1)} />
          <MetricPill label="Latest" value={entry.latestScore > 0 ? entry.latestScore.toFixed(1) : '--'} />
          <MetricPill label="Rating" value={entry.averageRating > 0 ? entry.averageRating.toFixed(1) : '--'} />
          {canManageWatchlist ? (
            <button
              onClick={() => void onToggleWatchlist(entry)}
              disabled={updatingWatchlistKey === entry.playerKey}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                entry.isWatchlisted
                  ? 'bg-[var(--color-primary-deep)] text-white shadow-[0_14px_30px_rgba(34,27,102,0.22)]'
                  : 'border border-[var(--color-mid)]/20 bg-white text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Star size={16} fill={entry.isWatchlisted ? 'currentColor' : 'none'} />
                {entry.isWatchlisted ? 'Shortlisted' : 'Shortlist'}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] border border-[var(--color-primary)]/14 bg-[linear-gradient(180deg,rgba(49,39,131,0.06),rgba(255,255,255,1))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                Development curve
              </p>
              <h3 className="mt-2 text-lg font-black text-[var(--color-dark)]">Score trend</h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/80 text-[var(--color-primary)]">
              <TrendingUp size={18} />
            </div>
          </div>

          {trendPath ? (
            <div className="mt-4">
              <svg viewBox="0 0 280 96" className="h-28 w-full overflow-visible">
                <defs>
                  <linearGradient id="player-trend-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="rgba(49,39,131,0.34)" />
                    <stop offset="100%" stopColor="rgba(190,23,23,0.34)" />
                  </linearGradient>
                </defs>
                <path d="M0,95 H280" stroke="rgba(148,163,184,0.28)" strokeDasharray="4 4" />
                <path d={trendPath} fill="none" stroke="url(#player-trend-gradient)" strokeWidth="4" strokeLinecap="round" />
                {trendStops.map((point) => (
                  <g key={`${entry.playerKey}-${point.x}-${point.y}`}>
                    <circle cx={point.x} cy={point.y} r="6" fill="white" stroke="rgba(49,39,131,0.9)" strokeWidth="3" />
                  </g>
                ))}
              </svg>
              <div className="mt-3 flex flex-wrap gap-2">
                {entry.trendPoints.map((point) => (
                  <span
                    key={`${entry.playerKey}-${point.reportId}`}
                    className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-black text-[var(--color-primary)] shadow-[0_6px_16px_rgba(49,39,131,0.08)]"
                  >
                    {formatDisplayDate(point.date)} • {point.score.toFixed(1)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-mid)]/20 bg-white/72 p-4 text-sm font-semibold text-[var(--color-mid)]">
              Add more scored reviews to unlock the player trend curve.
            </div>
          )}
        </div>

        <div className="rounded-[24px] border border-[var(--color-mid)]/14 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.96))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                Attribute mix
              </p>
              <h3 className="mt-2 text-lg font-black text-[var(--color-dark)]">Scouting profile</h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
              <BarChart3 size={18} />
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[184px_1fr] lg:items-center">
            <AttributeRadar metrics={radarMetrics} chartId={`player-radar-${entry.playerKey.replace(/[^a-z0-9]/gi, '-')}`} />

            <div className="space-y-3">
              {PROFILE_METRICS.map((metric) => (
                <div key={metric.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
                      {metric.label}
                    </p>
                    <p className="text-sm font-black text-[var(--color-dark)]">
                      {entry.metrics[metric.key].toFixed(1)}
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--color-primary)]/10">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-accent))]"
                      style={{ width: `${Math.max(8, (entry.metrics[metric.key] / 5) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
        <InsightCard
          icon={<Sparkles size={18} />}
          title="Overview"
          body={entry.overview || entry.strengths || 'No overview added yet for this player.'}
          tone="primary"
        />
        <InsightCard
          icon={<Activity size={18} />}
          title="Improvement focus"
          body={entry.improvementAreas || 'No improvement focus logged yet.'}
          tone="accent"
        />
        <div className="rounded-[24px] border border-[var(--color-mid)]/14 bg-[var(--color-light)]/55 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
            Latest verdict
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-dark)]">
            {entry.latestVerdict}
          </p>
          {entry.latestReportId ? (
            <button
              onClick={() => onOpenReport(entry.latestReportId)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_26px_rgba(49,39,131,0.2)] transition-opacity hover:opacity-90"
            >
              Open latest report
              <ArrowRight size={16} />
            </button>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-mid)]/22 bg-white/72 px-4 py-3 text-sm font-black text-[var(--color-mid)]">
              First report not linked yet
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 px-4 py-3 text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--color-dark)]">{value}</p>
    </div>
  );
}

function AttributeRadar({
  metrics,
  chartId,
}: {
  metrics: Array<{ label: string; value: number }>;
  chartId: string;
}) {
  const size = 180;
  const radius = 70;
  const points = buildRadarChartPoints(metrics, size, radius);
  const polygon = buildRadarChartPolygon(points);
  const gridPolygons = [1.25, 2.5, 3.75, 5].map((value) =>
    buildRadarChartPolygon(
      buildRadarChartPoints(
        metrics.map((metric) => ({
          label: metric.label,
          value,
        })),
        size,
        radius,
      ),
    ),
  );
  const axisPoints = buildRadarChartPoints(
    metrics.map((metric) => ({
      label: metric.label,
      value: 5,
    })),
    size,
    radius,
  );

  return (
    <div className="mx-auto w-full max-w-[184px] rounded-[24px] border border-[var(--color-primary)]/12 bg-[radial-gradient(circle_at_50%_35%,rgba(49,39,131,0.10),rgba(255,255,255,0.88)_58%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-[180px] w-full overflow-visible" role="img" aria-label="Player scouting attribute radar">
        <defs>
          <linearGradient id={chartId} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(49,39,131,0.72)" />
            <stop offset="100%" stopColor="rgba(190,23,23,0.62)" />
          </linearGradient>
        </defs>

        {gridPolygons.map((gridPolygon, index) => (
          <polygon
            key={`${gridPolygon}-${index}`}
            points={gridPolygon}
            fill="none"
            stroke="rgba(148,163,184,0.26)"
            strokeWidth="1"
          />
        ))}

        {axisPoints.map((point) => (
          <line
            key={`${point.label}-axis`}
            x1={size / 2}
            y1={size / 2}
            x2={point.x}
            y2={point.y}
            stroke="rgba(148,163,184,0.22)"
            strokeWidth="1"
          />
        ))}

        {polygon ? (
          <>
            <polygon
              points={polygon}
              fill={`url(#${chartId})`}
              fillOpacity="0.18"
              stroke={`url(#${chartId})`}
              strokeLinejoin="round"
              strokeWidth="3"
            />
            {points.map((point) => (
              <circle
                key={`${point.label}-point`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="white"
                stroke="rgba(49,39,131,0.86)"
                strokeWidth="2"
              />
            ))}
          </>
        ) : null}

        <circle cx={size / 2} cy={size / 2} r="3" fill="rgba(49,39,131,0.34)" />
      </svg>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  body,
  tone,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  tone: 'primary' | 'accent';
}) {
  return (
    <div
      className={`rounded-[24px] border p-4 ${
        tone === 'primary'
          ? 'border-[var(--color-primary)]/14 bg-[linear-gradient(180deg,rgba(49,39,131,0.05),rgba(255,255,255,1))]'
          : 'border-[var(--color-accent)]/14 bg-[linear-gradient(180deg,rgba(190,23,23,0.04),rgba(255,255,255,1))]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 items-center justify-center rounded-2xl ${
            tone === 'primary'
              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">{title}</p>
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-mid)]">{body}</p>
    </div>
  );
}

function UsersFallbackIcon() {
  return <Sparkles size={18} />;
}
