import { useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  FileText,
  Loader2,
  RefreshCcw,
  Send,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import type {
  AdminAiInsights,
  AdminChatMessage,
  AdminDashboardOverview,
} from '../lib/data';

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

type AdminDashboardPanelProps = {
  overview: AdminDashboardOverview;
  onOpenReport: (reportId: string) => void;
  insights: AdminAiInsights | null;
  insightsLoading: boolean;
  insightsError: string;
  onRefreshInsights: () => void;
  chatMessages: AdminChatMessage[];
  chatLoading: boolean;
  chatError: string;
  onSendChat: (message: string) => Promise<void>;
};

export default function AdminDashboardPanel({
  overview,
  onOpenReport,
  insights,
  insightsLoading,
  insightsError,
  onRefreshInsights,
  chatMessages,
  chatLoading,
  chatError,
  onSendChat,
}: AdminDashboardPanelProps) {
  const [draftMessage, setDraftMessage] = useState('');

  const statCards = [
    {
      label: 'Total Reports',
      value: overview.totalReports,
      hint: `${overview.competitionsTracked} competitions tracked`,
      icon: FileText,
      surface:
        'bg-[linear-gradient(135deg,rgba(49,39,131,0.12),rgba(73,62,179,0.08))] border-[var(--color-primary)]/15',
      iconSurface: 'bg-[var(--color-primary)]/12 text-[var(--color-primary)]',
      valueColor: 'text-[var(--color-primary)]',
    },
    {
      label: 'Total Users',
      value: overview.totalUsers,
      hint: `${overview.totalAdmins} admin accounts`,
      icon: Users,
      surface:
        'bg-[linear-gradient(135deg,rgba(190,23,23,0.10),rgba(255,255,255,0.9))] border-[var(--color-accent)]/15',
      iconSurface: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
      valueColor: 'text-[var(--color-accent)]',
    },
    {
      label: 'Active Scouts',
      value: overview.activeScouts,
      hint: 'Users with at least one saved report',
      icon: BarChart3,
      surface:
        'bg-[linear-gradient(135deg,rgba(213,170,77,0.16),rgba(255,255,255,0.95))] border-[#d5aa4d]/20',
      iconSurface: 'bg-[#d5aa4d]/18 text-[#7c5b11]',
      valueColor: 'text-[#7c5b11]',
    },
    {
      label: 'Last 7 Days',
      value: overview.reportsLast7Days,
      hint: 'Fresh reports created recently',
      icon: Activity,
      surface:
        'bg-[linear-gradient(135deg,rgba(35,76,112,0.12),rgba(255,255,255,0.96))] border-sky-700/15',
      iconSurface: 'bg-sky-700/12 text-sky-700',
      valueColor: 'text-sky-700',
    },
  ];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const value = draftMessage.trim();
    if (!value || chatLoading) return;
    setDraftMessage('');
    await onSendChat(value);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className={`rounded-[24px] border p-5 shadow-[0_14px_36px_rgba(49,39,131,0.06)] ${card.surface}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--color-mid)]">
                    {card.label}
                  </p>
                  <p className={`mt-3 text-4xl font-black leading-none ${card.valueColor}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`rounded-2xl p-3 ${card.iconSurface}`}>
                  <Icon size={22} />
                </div>
              </div>
              <p className="mt-4 text-xs font-semibold text-[var(--color-dark)]/65">{card.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[24px] border border-[var(--color-primary)]/12 bg-[linear-gradient(180deg,rgba(49,39,131,0.03),rgba(255,255,255,1))] p-5 shadow-[0_14px_36px_rgba(49,39,131,0.06)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-primary)]/10 pb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--color-mid)]">
                AI Improvement Suggestions
              </p>
              <h3 className="mt-2 text-xl font-black text-[var(--color-dark)] md:text-2xl">
                Gemini review of admin data
              </h3>
            </div>
            <button
              type="button"
              onClick={onRefreshInsights}
              disabled={insightsLoading}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-primary)]/15 bg-white px-4 py-2 text-sm font-black text-[var(--color-primary)] transition-all hover:bg-[var(--color-primary)]/[0.03] disabled:opacity-50"
            >
              {insightsLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh
            </button>
          </div>

          <div className="mt-4 rounded-[22px] border border-[var(--color-primary)]/12 bg-white p-5">
            {insightsLoading ? (
              <div className="flex items-center gap-3 text-sm font-semibold text-[var(--color-mid)]">
                <Loader2 size={18} className="animate-spin" />
                Generating suggestions from the report data...
              </div>
            ) : insightsError ? (
              <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {insightsError}
              </div>
            ) : insights ? (
              <div className="space-y-5">
                <div className="rounded-[20px] bg-[linear-gradient(135deg,rgba(49,39,131,0.10),rgba(73,62,179,0.04))] px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-2xl bg-[var(--color-primary)]/12 p-2 text-[var(--color-primary)]">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                        Headline
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-dark)]">
                        {insights.headline}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {insights.suggestions.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[20px] border border-[var(--color-primary)]/10 bg-[var(--color-light)]/55 p-4"
                    >
                      <p className="text-sm font-black uppercase tracking-[0.1em] text-[var(--color-primary)]">
                        {item.title}
                      </p>
                      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-dark)]/80">
                        {item.rationale}
                      </p>
                      <div className="mt-4 rounded-[16px] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                        Action: {item.action}
                      </div>
                    </div>
                  ))}
                </div>

                {insights.watchouts.length > 0 && (
                  <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertTriangle size={16} />
                      <p className="text-[11px] font-black uppercase tracking-[0.24em]">Watchouts</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {insights.watchouts.map((item) => (
                        <p key={item} className="text-sm font-semibold leading-6 text-amber-900/85">
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm font-semibold text-[var(--color-mid)]">
                No AI suggestions yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(237,242,244,0.82))] p-5 shadow-[0_14px_36px_rgba(49,39,131,0.06)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-mid)]/16 pb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--color-mid)]">
                Admin Assistant
              </p>
              <h3 className="mt-2 text-xl font-black text-[var(--color-dark)] md:text-2xl">
                Ask the dashboard agent
              </h3>
            </div>
            <div className="rounded-2xl bg-[var(--color-primary)]/8 p-3 text-[var(--color-primary)]">
              <Bot size={20} />
            </div>
          </div>

          <div className="mt-4 h-[260px] space-y-3 overflow-auto rounded-[20px] border border-[var(--color-mid)]/14 bg-white/85 p-4 md:h-[340px]">
            {chatMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[88%] rounded-[18px] px-4 py-3 text-sm font-semibold leading-6 ${
                  message.role === 'assistant'
                    ? 'bg-[var(--color-light)] text-[var(--color-dark)]'
                    : 'ml-auto bg-[var(--color-primary)] text-white'
                }`}
              >
                {message.content}
              </div>
            ))}

            {chatLoading && (
              <div className="inline-flex items-center gap-2 rounded-[18px] bg-[var(--color-light)] px-4 py-3 text-sm font-semibold text-[var(--color-mid)]">
                <Loader2 size={16} className="animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          {chatError && (
            <div className="mt-3 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {chatError}
            </div>
          )}

          <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder="Ask about top scouts, best players, report quality..."
              className="flex-1 rounded-2xl border border-[var(--color-mid)]/20 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/12"
            />
            <button
              type="submit"
              disabled={chatLoading || !draftMessage.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 sm:self-auto"
            >
              <Send size={16} />
              Send
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_14px_36px_rgba(49,39,131,0.06)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-mid)]/16 pb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--color-mid)]">
                Players Reported Well
              </p>
              <h3 className="mt-2 text-xl font-black text-[var(--color-dark)] md:text-2xl">
                Highest-rated monitored players
              </h3>
            </div>
            <div className="rounded-2xl bg-[#d5aa4d]/18 p-3 text-[#7c5b11]">
              <Trophy size={20} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {overview.topPlayers.length > 0 ? (
              overview.topPlayers.map((player) => (
                <button
                  key={player.player_id}
                  type="button"
                  onClick={() => onOpenReport(player.report_id)}
                  className="rounded-[22px] border border-[#d5aa4d]/20 bg-[linear-gradient(135deg,rgba(213,170,77,0.14),rgba(255,255,255,0.96))] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(124,91,17,0.10)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-[var(--color-dark)]">
                        #{player.shirt_number || '-'} {player.name}
                      </p>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-[#7c5b11]">
                        {player.potential_level} • {player.team_side} side
                      </p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#7c5b11] shadow-sm">
                      {player.average_score}/5
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-dark)]/82">
                    {player.verdict}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[var(--color-dark)]/62">
                    <span>{player.fixture}</span>
                    <span>{formatDisplayDate(player.report_date)}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="md:col-span-2 rounded-[20px] border border-dashed border-[var(--color-mid)]/24 bg-[var(--color-light)]/35 px-4 py-8 text-center text-sm font-semibold text-[var(--color-mid)]">
                No player reviews have enough data yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_14px_36px_rgba(49,39,131,0.06)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-mid)]/16 pb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--color-mid)]">
                Recent Reports
              </p>
              <h3 className="mt-2 text-xl font-black text-[var(--color-dark)] md:text-2xl">
                Latest saved scouting reports
              </h3>
            </div>
            <div className="rounded-2xl bg-[var(--color-primary)]/8 p-3 text-[var(--color-primary)]">
              <FileText size={20} />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {overview.recentReports.length > 0 ? (
              overview.recentReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => onOpenReport(report.id)}
                  className="flex w-full items-center justify-between gap-4 rounded-[20px] border border-[var(--color-mid)]/14 bg-[var(--color-light)]/40 px-4 py-4 text-left transition-all hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-primary)]/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase tracking-[0.08em] text-[var(--color-primary)]">
                      {report.competition}
                    </p>
                    <p className="mt-1 truncate text-base font-bold text-[var(--color-dark)]">
                      {report.home_team} vs {report.away_team}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-[var(--color-mid)]">
                      {report.owner_name} {report.owner_email ? `• ${report.owner_email}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">
                      Match Date
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-dark)]">
                      {formatDisplayDate(report.date || report.created_at)}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-[var(--color-mid)]/24 bg-[var(--color-light)]/35 px-4 py-8 text-center text-sm font-semibold text-[var(--color-mid)]">
                No saved reports yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_14px_36px_rgba(49,39,131,0.06)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-mid)]/16 pb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--color-mid)]">
                Users
              </p>
              <h3 className="mt-2 text-2xl font-black text-[var(--color-dark)]">
                Scouts and admins
              </h3>
            </div>
            <div className="rounded-2xl bg-[var(--color-primary)]/8 p-3 text-[var(--color-primary)]">
              <Users size={20} />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {overview.users.length > 0 ? (
              overview.users.slice(0, 8).map((dashboardUser) => (
                <div
                  key={dashboardUser.id}
                  className="rounded-[20px] border border-[var(--color-mid)]/14 bg-[var(--color-light)]/40 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-[var(--color-dark)]">
                        {dashboardUser.name}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-[var(--color-mid)]">
                        {dashboardUser.email}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-[var(--color-mid)]">
                        {dashboardUser.organization || 'No organization'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                        dashboardUser.role.toLowerCase() === 'admin'
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'bg-[var(--color-mid)]/12 text-[var(--color-dark)]'
                      }`}
                    >
                      {dashboardUser.role}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[var(--color-mid)]">
                    <span>{dashboardUser.reportCount} reports</span>
                    <span>
                      {dashboardUser.lastReportDate
                        ? `Last report ${formatDisplayDate(dashboardUser.lastReportDate)}`
                        : 'No reports yet'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-[var(--color-mid)]/24 bg-[var(--color-light)]/35 px-4 py-8 text-center text-sm font-semibold text-[var(--color-mid)]">
                No users found.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_14px_36px_rgba(49,39,131,0.06)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-mid)]/16 pb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--color-mid)]">
                Short Notes
              </p>
              <h3 className="mt-2 text-2xl font-black text-[var(--color-dark)]">
                Fast context from saved reports
              </h3>
            </div>
            <div className="rounded-2xl bg-[var(--color-primary)]/8 p-3 text-[var(--color-primary)]">
              <Shield size={20} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {overview.quickNotes.length > 0 ? (
              overview.quickNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => onOpenReport(note.id)}
                  className="rounded-[22px] border border-[var(--color-mid)]/14 bg-[linear-gradient(180deg,rgba(49,39,131,0.035),rgba(49,39,131,0.01))] p-4 text-left transition-all hover:border-[var(--color-primary)]/35 hover:shadow-[0_16px_34px_rgba(49,39,131,0.08)]"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
                    {note.report_date ? formatDisplayDate(note.report_date) : 'No match date'}
                  </p>
                  <p className="mt-2 text-lg font-black text-[var(--color-dark)]">
                    {note.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                    {note.owner_name}
                  </p>
                  <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-dark)]/80">
                    {note.excerpt}
                  </p>
                </button>
              ))
            ) : (
              <div className="md:col-span-2 rounded-[20px] border border-dashed border-[var(--color-mid)]/24 bg-[var(--color-light)]/35 px-4 py-8 text-center text-sm font-semibold text-[var(--color-mid)]">
                No quick notes available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
