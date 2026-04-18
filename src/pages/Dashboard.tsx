import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, FileText, Plus, Search, Trash2 } from 'lucide-react';
import AdminDashboardPanel from '../components/AdminDashboardPanel';
import AppSidebar from '../components/AppSidebar';
import {
  deleteReport,
  fetchAdminAiInsights,
  fetchAdminDashboardOverview,
  fetchReports,
  sendAdminChatMessage,
  type AdminAiContext,
  type AdminAiInsights,
  type AdminChatMessage,
  type AdminDashboardOverview,
} from '../lib/data';
import { useAuthStore } from '../store/auth';
import type { Report } from '../store/report';

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

function buildAdminAiContext(overview: AdminDashboardOverview): AdminAiContext {
  return {
    summary: {
      totalUsers: overview.totalUsers,
      totalAdmins: overview.totalAdmins,
      totalReports: overview.totalReports,
      reportsLast7Days: overview.reportsLast7Days,
      competitionsTracked: overview.competitionsTracked,
      activeScouts: overview.activeScouts,
    },
    topPlayers: overview.topPlayers.map((player) => ({
      name: player.name,
      potentialLevel: player.potential_level,
      verdict: player.verdict,
      averageScore: player.average_score,
      mentions: player.mentions,
      fixture: player.fixture,
      reportDate: player.report_date,
    })),
    recentReports: overview.recentReports.map((report) => ({
      competition: report.competition,
      fixture: `${report.home_team} vs ${report.away_team}`,
      owner: report.owner_name || report.owner_email,
      date: report.date || report.created_at,
    })),
    quickNotes: overview.quickNotes.map((note) => ({
      title: note.title,
      owner: note.owner_name,
      excerpt: note.excerpt,
    })),
    users: overview.users.slice(0, 12).map((user) => ({
      name: user.name,
      role: user.role,
      reportCount: user.reportCount,
    })),
  };
}

const REPORT_CARD_VARIANTS = [
  {
    shell:
      'border-[var(--color-primary)]/18 bg-[linear-gradient(180deg,rgba(49,39,131,0.04),rgba(255,255,255,1))] hover:border-[var(--color-primary)]/45',
    badge: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    score: 'text-[var(--color-primary)]',
    surface: 'bg-[linear-gradient(180deg,rgba(49,39,131,0.07),rgba(49,39,131,0.02))]',
  },
  {
    shell:
      'border-[var(--color-accent)]/16 bg-[linear-gradient(180deg,rgba(190,23,23,0.035),rgba(255,255,255,1))] hover:border-[var(--color-accent)]/42',
    badge: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
    score: 'text-[var(--color-accent)]',
    surface: 'bg-[linear-gradient(180deg,rgba(190,23,23,0.065),rgba(190,23,23,0.02))]',
  },
  {
    shell:
      'border-[#d5aa4d]/18 bg-[linear-gradient(180deg,rgba(213,170,77,0.055),rgba(255,255,255,1))] hover:border-[#d5aa4d]/45',
    badge: 'bg-[#d5aa4d]/18 text-[#7c5b11]',
    score: 'text-[#7c5b11]',
    surface: 'bg-[linear-gradient(180deg,rgba(213,170,77,0.09),rgba(213,170,77,0.02))]',
  },
];

export default function Dashboard() {
  const { user, token, logout } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminDashboardOverview | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [adminLoadError, setAdminLoadError] = useState('');
  const [insights, setInsights] = useState<AdminAiInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');
  const [chatMessages, setChatMessages] = useState<AdminChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Admin assistant ready. Ask about top scouts, strongest reported players, report quality trends or workload balance.',
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const navigate = useNavigate();
  const isAdmin = (user?.role || '').trim().toLowerCase() === 'admin';
  const reportsThisWeek = reports.filter((report) => {
    const rawDate = report.date || '';
    const parsedDate = rawDate ? new Date(rawDate) : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime())) return false;
    return Date.now() - parsedDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setAdminLoadError('');

    void (async () => {
      try {
        const [data, overview] = await Promise.all([
          fetchReports(),
          isAdmin ? fetchAdminDashboardOverview() : Promise.resolve(null),
        ]);

        if (!isMounted) return;
        setReports(data);
        setAdminOverview(overview);
      } catch (error) {
        console.error('Failed to load reports.', error);
        if (!isMounted) return;
        setAdminLoadError(isAdmin ? 'Failed to load admin dashboard data.' : '');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [token, isAdmin]);

  useEffect(() => {
    if (!isAdmin || !adminOverview) {
      setInsights(null);
      setInsightsError('');
      return;
    }

    let isMounted = true;

    void (async () => {
      setInsightsLoading(true);
      setInsightsError('');
      try {
        const result = await fetchAdminAiInsights(buildAdminAiContext(adminOverview));
        if (!isMounted) return;
        setInsights(result);
      } catch (error: any) {
        if (!isMounted) return;
        console.error('Failed to load AI insights.', error);
        setInsightsError(error.message || 'Failed to load AI insights.');
      } finally {
        if (isMounted) {
          setInsightsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [
    isAdmin,
    adminOverview?.totalReports,
    adminOverview?.reportsLast7Days,
    adminOverview?.topPlayers.length,
    adminOverview?.quickNotes.length,
  ]);

  const filteredReports = reports.filter(
    (report) =>
      report.home_team.toLowerCase().includes(search.toLowerCase()) ||
      report.away_team.toLowerCase().includes(search.toLowerCase()) ||
      report.competition.toLowerCase().includes(search.toLowerCase()) ||
      (isAdmin &&
        `${report.owner_name || ''} ${report.owner_email || ''}`.toLowerCase().includes(search.toLowerCase())),
  );

  const handleDeleteReport = async (event: MouseEvent, reportId: string) => {
    event.stopPropagation();

    const confirmed = window.confirm('Delete this report permanently?');
    if (!confirmed) return;

    setDeletingReportId(reportId);

    try {
      await deleteReport(reportId);
      setReports((currentReports) => currentReports.filter((report) => report.id !== reportId));
      setAdminOverview((currentOverview) =>
        currentOverview
          ? {
              ...currentOverview,
              totalReports: Math.max(0, currentOverview.totalReports - 1),
              recentReports: currentOverview.recentReports.filter((report) => report.id !== reportId),
              quickNotes: currentOverview.quickNotes.filter((note) => note.id !== reportId),
              topPlayers: currentOverview.topPlayers.filter((player) => player.report_id !== reportId),
            }
          : currentOverview,
      );
    } catch (error) {
      console.error('Failed to delete report.', error);
      window.alert('Failed to delete report.');
    } finally {
      setDeletingReportId(null);
    }
  };

  const handleRefreshInsights = async () => {
    if (!adminOverview) return;

    setInsightsLoading(true);
    setInsightsError('');
    try {
      const result = await fetchAdminAiInsights(buildAdminAiContext(adminOverview));
      setInsights(result);
    } catch (error: any) {
      console.error('Failed to refresh AI insights.', error);
      setInsightsError(error.message || 'Failed to refresh AI insights.');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleSendChat = async (message: string) => {
    if (!adminOverview) return;

    const nextMessages = [...chatMessages, { role: 'user' as const, content: message }];
    setChatMessages(nextMessages);
    setChatLoading(true);
    setChatError('');

    try {
      const result = await sendAdminChatMessage(buildAdminAiContext(adminOverview), nextMessages);
      setChatMessages((currentMessages) => [...currentMessages, { role: 'assistant', content: result.reply }]);
    } catch (error: any) {
      console.error('Failed to send admin chat message.', error);
      setChatError(error.message || 'Failed to contact the admin assistant.');
      setChatMessages(chatMessages);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-light)] flex flex-col md:flex-row">
      <AppSidebar
        current="reports"
        isAdmin={isAdmin}
        userName={user?.name}
        organization={user?.organization}
        onNavigateReports={() => navigate('/')}
        onNavigatePlayers={() => navigate('/players')}
        onNavigateSettings={() => navigate('/settings')}
        onLogout={() => void logout()}
      />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto w-full max-w-[1560px] space-y-5">
          <div className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface relative overflow-hidden px-4 py-4 text-white md:px-6 md:py-5">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-start xl:justify-between xl:gap-5 xl:pb-5">
                <div className="flex items-center gap-3">
                  <img
                    src="/branding/mwos-fc-300-2.png"
                    alt="MWOS logo"
                    className="h-9 w-9 rounded-full border border-white/20 bg-white/10 p-0.5 md:h-12 md:w-12"
                  />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/68 md:text-[11px] md:tracking-[0.32em]">
                      MWOS Football Club
                    </p>
                    <h2 className="mt-1 mwos-display text-[2rem] uppercase leading-none tracking-[0.05em] text-white md:mt-2 md:text-4xl xl:text-5xl">
                      {isAdmin ? 'Admin Dashboard' : 'Dashboard'}
                    </h2>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2.5 xl:max-w-[680px] xl:items-end">
                  <div className="flex w-full items-center rounded-2xl border border-white/12 bg-white/10 px-3.5 py-3 shadow-[0_12px_24px_rgba(12,16,53,0.12)] backdrop-blur-sm">
                    <Search className="mr-3 text-white/68" size={18} />
                    <input
                      type="text"
                      placeholder={isAdmin ? 'Search reports, competitions, creators…' : 'Search tracked reports and notes…'}
                      className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-white/60 outline-none"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => navigate('/report/new')}
                    className="self-start rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-[var(--color-primary)] shadow-[0_16px_32px_rgba(12,16,53,0.22)] transition-all hover:-translate-y-0.5 xl:self-auto"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Plus size={18} />
                      New Report
                    </span>
                  </button>
                </div>
              </div>

              <p className="mt-4 hidden max-w-3xl text-sm font-semibold text-white/76 md:block">
                {isAdmin
                  ? 'Track club-wide reports, user activity, strong player mentions and AI-guided improvement ideas from one admin workspace.'
                  : 'Review match reports, scout outputs and club-wide activity from one branded workspace.'}
              </p>
            </div>
          </div>

          {!isAdmin ? (
            <div className="grid grid-cols-3 gap-2 md:hidden">
              {[
                { label: 'Reports', value: reports.length },
                { label: 'This Week', value: reportsThisWeek },
                { label: 'Shown', value: filteredReports.length },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className={`rounded-[20px] border px-3 py-3 shadow-[0_12px_28px_rgba(49,39,131,0.06)] ${
                    index === 0
                      ? 'border-[var(--color-primary)]/15 bg-[linear-gradient(135deg,rgba(49,39,131,0.10),rgba(255,255,255,0.96))]'
                      : index === 1
                        ? 'border-[var(--color-accent)]/12 bg-[linear-gradient(135deg,rgba(190,23,23,0.08),rgba(255,255,255,0.96))]'
                        : 'border-[#d5aa4d]/18 bg-[linear-gradient(135deg,rgba(213,170,77,0.12),rgba(255,255,255,0.96))]'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">{item.label}</p>
                  <p className="mt-2 text-2xl font-black leading-none text-[var(--color-dark)]">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}

          {isAdmin && adminLoadError && (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {adminLoadError}
            </div>
          )}

          {isAdmin && adminOverview && (
            <AdminDashboardPanel
              overview={adminOverview}
              onOpenReport={(reportId) => navigate(`/report/${reportId}`)}
              insights={insights}
              insightsLoading={insightsLoading}
              insightsError={insightsError}
              onRefreshInsights={() => void handleRefreshInsights()}
              chatMessages={chatMessages}
              chatLoading={chatLoading}
              chatError={chatError}
              onSendChat={handleSendChat}
            />
          )}

          {/* Mobile compact list */}
          <div className="md:hidden">
            {loading && (
              <div className="py-10 text-center text-[var(--color-mid)]">
                <p className="text-base font-semibold">Loading reports...</p>
              </div>
            )}

            {!loading && filteredReports.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-[var(--color-mid)]/30 bg-white/70 py-10 text-center text-[var(--color-mid)]">
                <FileText size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-base font-semibold">No reports found.</p>
              </div>
            )}

            {!loading && filteredReports.length > 0 && (
              <div className="overflow-hidden rounded-[24px] border border-[var(--color-mid)]/18 bg-white shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                {filteredReports.map((report, index) => {
                  const variant = REPORT_CARD_VARIANTS[index % REPORT_CARD_VARIANTS.length];
                  const isLast = index === filteredReports.length - 1;

                  return (
                    <div
                      key={report.id}
                      onClick={() => navigate(`/report/${report.id}`)}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors active:bg-[var(--color-light)] ${!isLast ? 'border-b border-[var(--color-mid)]/12' : ''}`}
                    >
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xs font-black ${variant.badge}`}>
                        {report.home_score !== null && report.away_score !== null
                          ? `${report.home_score}-${report.away_score}`
                          : <FileText size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[var(--color-dark)]">
                          {report.home_team || 'Home'} vs {report.away_team || 'Away'}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${variant.badge}`}>
                            {report.competition || 'Friendly'}
                          </span>
                          <span className="flex items-center text-[10px] font-semibold text-[var(--color-mid)]">
                            <Calendar size={10} className="mr-1" />
                            {formatDisplayDate(report.date)}
                          </span>
                        </div>
                        {isAdmin && (report.owner_name || report.owner_email) && (
                          <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--color-mid)]">
                            {report.owner_name || report.owner_email}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={(event) => void handleDeleteReport(event, report.id!)}
                          disabled={deletingReportId === report.id}
                          className="rounded-lg p-2 text-[var(--color-mid)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          aria-label="Delete report"
                        >
                          <Trash2 size={15} />
                        </button>
                        <ChevronRight size={18} className="text-[var(--color-mid)]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop card grid */}
          <div className="hidden md:grid md:grid-cols-2 md:gap-4 xl:grid-cols-3">
            {!loading &&
              filteredReports.map((report, index) => {
                const variant = REPORT_CARD_VARIANTS[index % REPORT_CARD_VARIANTS.length];

                return (
                  <div
                    key={report.id}
                    onClick={() => navigate(`/report/${report.id}`)}
                    className={`group cursor-pointer rounded-[24px] border p-4 shadow-[0_16px_45px_rgba(49,39,131,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(49,39,131,0.11)] ${variant.shell}`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="min-w-0 pr-4">
                        <span className={`rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider ${variant.badge}`}>
                          {report.competition || 'Friendly'}
                        </span>
                        {isAdmin && (report.owner_name || report.owner_email) && (
                          <p className="mt-2 truncate text-[11px] font-semibold text-[var(--color-mid)]">
                            Created by {report.owner_name || report.owner_email}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center text-xs font-semibold text-[var(--color-mid)]">
                          <Calendar size={12} className="mr-1" />
                          {formatDisplayDate(report.date)}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => void handleDeleteReport(event, report.id!)}
                          disabled={deletingReportId === report.id}
                          className="rounded-lg p-1.5 text-[var(--color-mid)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          aria-label="Delete report"
                          title="Delete report"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className={`mb-4 flex items-center justify-between gap-3 rounded-[20px] px-4 py-5 ${variant.surface}`}>
                      <div className="flex-1 text-center">
                        <p className="truncate text-base font-bold text-[var(--color-dark)]">{report.home_team || 'Home'}</p>
                        <p className={`mt-1 text-xl font-black ${variant.score}`}>
                          {report.home_score !== null ? report.home_score : '-'}
                        </p>
                      </div>
                      <div className="px-1 text-lg font-black text-[var(--color-mid)]">VS</div>
                      <div className="flex-1 text-center">
                        <p className="truncate text-base font-bold text-[var(--color-dark)]">{report.away_team || 'Away'}</p>
                        <p className={`mt-1 text-xl font-black ${variant.score}`}>
                          {report.away_score !== null ? report.away_score : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--color-mid)]/20 pt-3">
                      <span className="truncate text-xs font-semibold text-[var(--color-mid)]">{report.venue || 'Unknown Venue'}</span>
                      <span className="text-xs font-bold text-[var(--color-primary)] group-hover:underline">Edit Report &rarr;</span>
                    </div>
                  </div>
                );
              })}

            {loading && (
              <div className="col-span-full py-12 text-center text-[var(--color-mid)]">
                <p className="text-lg font-semibold">Loading reports...</p>
              </div>
            )}

            {!loading && filteredReports.length === 0 && (
              <div className="col-span-full rounded-[28px] border border-dashed border-[var(--color-mid)]/30 bg-white/70 py-12 text-center text-[var(--color-mid)]">
                <FileText size={48} className="mx-auto mb-4 opacity-40" />
                <p className="text-lg font-semibold">No reports found.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
