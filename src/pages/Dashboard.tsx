import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, FileText, Trash2 } from 'lucide-react';
import AdminDashboardPanel from '../components/AdminDashboardPanel';
import AppSidebar from '../components/AppSidebar';
import ConfirmActionModal from '../components/ConfirmActionModal';
import ScoutingWorkspaceActions from '../components/scouting/ScoutingWorkspaceActions';
import ScoutCodeOfConductCard from '../components/scouting/ScoutCodeOfConductCard';
import ScoutingWorkspaceHero from '../components/scouting/ScoutingWorkspaceHero';
import ScoutingWorkspaceMetrics from '../components/scouting/ScoutingWorkspaceMetrics';
import {
  fetchAdminAiStatus,
  canCreateScoutingReports,
  deleteReport,
  fetchAdminAiInsights,
  fetchAdminDashboardOverview,
  fetchPlayerHubData,
  fetchReports,
  userHasAnyRole,
  userHasRole,
  sendAdminChatMessage,
  type AdminAiContext,
  type AdminAiInsights,
  type AdminAiStatus,
  type AdminChatMessage,
  type AdminDashboardOverview,
  type PlayerHubOverview,
} from '../lib/data';
import {
  buildScoutingWorkspaceActions,
  buildScoutingWorkspaceHero,
  buildScoutingWorkspaceMetrics,
} from '../lib/scoutingWorkspaceDomain';
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
      'border-[var(--color-primary-deep)]/16 bg-[linear-gradient(180deg,rgba(34,27,102,0.045),rgba(255,255,255,1))] hover:border-[var(--color-primary-deep)]/38',
    badge: 'bg-[var(--color-primary-deep)]/10 text-[var(--color-primary-deep)]',
    score: 'text-[var(--color-primary-deep)]',
    surface: 'bg-[linear-gradient(180deg,rgba(34,27,102,0.08),rgba(34,27,102,0.02))]',
  },
];

export default function Dashboard() {
  const { user, token, logout } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminDashboardOverview | null>(null);
  const [playerHubOverview, setPlayerHubOverview] = useState<PlayerHubOverview | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [reportDeleteTargetId, setReportDeleteTargetId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [adminLoadError, setAdminLoadError] = useState('');
  const [insights, setInsights] = useState<AdminAiInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');
  const [adminAiStatus, setAdminAiStatus] = useState<AdminAiStatus | null>(null);
  const [adminAiStatusLoading, setAdminAiStatusLoading] = useState(false);
  const [adminAiStatusError, setAdminAiStatusError] = useState('');
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
  const isAdmin = userHasRole(user, 'admin');
  const isExecutiveDirector = userHasRole(user, 'executive_director');
  const isTechnicalDirector = userHasRole(user, 'technical_director');
  const isLeadership = userHasAnyRole(user, ['admin', 'executive_director', 'technical_director']);
  const canCreateReports = canCreateScoutingReports(user);
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
    setAdminAiStatusError('');

    void (async () => {
      try {
        const [data, playerHubData, overview] = await Promise.all([
          fetchReports(),
          fetchPlayerHubData(),
          isAdmin ? fetchAdminDashboardOverview() : Promise.resolve(null),
        ]);

        if (!isMounted) return;
        setReports(data);
        setPlayerHubOverview(playerHubData);
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
    if (!isAdmin || !token) {
      setAdminAiStatus(null);
      setAdminAiStatusLoading(false);
      setAdminAiStatusError('');
      return;
    }

    let isMounted = true;
    setAdminAiStatusLoading(true);
    setAdminAiStatusError('');

    void (async () => {
      try {
        const status = await fetchAdminAiStatus();
        if (!isMounted) return;
        setAdminAiStatus(status);
      } catch (error: any) {
        if (!isMounted) return;
        console.error('Failed to load club assistant status.', error);
        setAdminAiStatus(null);
        setAdminAiStatusError(error.message || 'Failed to load club assistant status.');
      } finally {
        if (isMounted) {
          setAdminAiStatusLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, token]);

  useEffect(() => {
    if (!isAdmin || !adminOverview || !adminAiStatus?.configured) {
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
    adminAiStatus?.configured,
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
      (isLeadership &&
        `${report.owner_name || ''} ${report.owner_email || ''}`.toLowerCase().includes(search.toLowerCase())),
  );

  const handleRequestDeleteReport = (event: MouseEvent, reportId: string) => {
    event.stopPropagation();
    setDeleteError('');
    setReportDeleteTargetId(reportId);
  };

  const handleConfirmDeleteReport = async () => {
    if (!reportDeleteTargetId) return;

    const reportId = reportDeleteTargetId;
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
      setDeleteError('Failed to delete report. Please try again.');
    } finally {
      setReportDeleteTargetId(null);
      setDeletingReportId(null);
    }
  };

  const handleRefreshInsights = async () => {
    if (!adminOverview || !adminAiStatus?.configured) return;

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
    if (!adminAiStatus?.configured) {
      setChatError('Club assistant is not active yet.');
      return;
    }

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

  const workspaceMode = isExecutiveDirector
    ? 'executive_director'
    : isTechnicalDirector
      ? 'technical_director'
      : isAdmin
        ? 'admin'
        : 'operator';
  const workspaceHero = buildScoutingWorkspaceHero(workspaceMode);
  const workspaceMetrics = buildScoutingWorkspaceMetrics({
    isLeadership,
    totalReports: reports.length,
    reportsThisWeek,
    filteredReports: filteredReports.length,
    trackedPlayers: playerHubOverview?.totalTrackedPlayers || 0,
    shortlistCount: playerHubOverview?.watchlistCount || 0,
    competitionsTracked:
      adminOverview?.competitionsTracked ||
      new Set(reports.map((report) => report.competition).filter(Boolean)).size,
  });
  const workspaceActions = buildScoutingWorkspaceActions({
    isLeadership,
    hasTrackedPlayers: (playerHubOverview?.totalTrackedPlayers || 0) > 0,
    canCreateReports,
  });
  const reportDeleteTarget = reports.find((report) => report.id === reportDeleteTargetId);

  return (
    <div className="min-h-dvh bg-[var(--color-light)] flex flex-col md:flex-row">
      <AppSidebar
        current="scouting"
        user={user}
        onLogout={() => void logout()}
      />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto w-full max-w-[1560px] space-y-5">
          <ScoutingWorkspaceHero
            hero={workspaceHero}
            search={search}
            onSearchChange={setSearch}
            primaryCtaLabel={canCreateReports ? 'New Report' : 'Open Player Hub'}
            onPrimaryCta={() => navigate(canCreateReports ? '/scouting/report/new' : '/players')}
            secondaryCtaLabel={canCreateReports ? 'Open Player Hub' : 'Open Oversight'}
            onSecondaryCta={() => navigate(canCreateReports ? '/players' : '/oversight')}
          />

          <ScoutingWorkspaceMetrics metrics={workspaceMetrics} />

          {isAdmin && adminLoadError && (
            <div className="mwos-card-tone-danger rounded-[24px] border px-4 py-3 text-sm font-semibold text-[var(--color-accent-deep)]">
              {adminLoadError}
            </div>
          )}

          {deleteError && (
            <div className="mwos-card-tone-danger rounded-[24px] border px-4 py-3 text-sm font-semibold text-[var(--color-accent-deep)]">
              {deleteError}
            </div>
          )}

          {isAdmin && adminOverview && (
          <AdminDashboardPanel
              overview={adminOverview}
              onOpenReport={(reportId) => navigate(`/scouting/report/${reportId}`)}
              aiStatus={adminAiStatus}
              aiStatusLoading={adminAiStatusLoading}
              aiStatusError={adminAiStatusError}
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

          <ScoutingWorkspaceActions
            actions={workspaceActions}
            onOpen={(path) => navigate(path)}
          />

          <ScoutCodeOfConductCard />

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
                      onClick={() => navigate(`/scouting/report/${report.id}`)}
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
                        {isLeadership && (report.owner_name || report.owner_email) && (
                          <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--color-mid)]">
                            {report.owner_name || report.owner_email}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        {canCreateReports ? (
                          <button
                            type="button"
                            onClick={(event) => handleRequestDeleteReport(event, report.id!)}
                            disabled={deletingReportId === report.id}
                            className="rounded-lg p-2 text-[var(--color-mid)] transition-colors hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] disabled:opacity-50"
                            aria-label="Delete report"
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : null}
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
                    onClick={() => navigate(`/scouting/report/${report.id}`)}
                    className={`group cursor-pointer rounded-[24px] border p-4 shadow-[0_16px_45px_rgba(49,39,131,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(49,39,131,0.11)] ${variant.shell}`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="min-w-0 pr-4">
                        <span className={`rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider ${variant.badge}`}>
                          {report.competition || 'Friendly'}
                        </span>
                        {isLeadership && (report.owner_name || report.owner_email) && (
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
                        {canCreateReports ? (
                          <button
                            type="button"
                            onClick={(event) => handleRequestDeleteReport(event, report.id!)}
                            disabled={deletingReportId === report.id}
                            className="rounded-lg p-1.5 text-[var(--color-mid)] transition-colors hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] disabled:opacity-50"
                            aria-label="Delete report"
                            title="Delete report"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
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
                      <span className="text-xs font-bold text-[var(--color-primary)] group-hover:underline">
                        {canCreateReports ? 'Edit Report' : 'Open Report'} &rarr;
                      </span>
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

      <ConfirmActionModal
        open={Boolean(reportDeleteTargetId)}
        title="Delete scouting report?"
        description={
          reportDeleteTarget
            ? `This will permanently delete ${reportDeleteTarget.home_team || 'Home'} vs ${reportDeleteTarget.away_team || 'Away'} and its saved scouting data.`
            : 'This will permanently delete the selected scouting report and its saved data.'
        }
        confirmLabel="Delete report"
        loading={Boolean(deletingReportId)}
        onCancel={() => setReportDeleteTargetId(null)}
        onConfirm={() => void handleConfirmDeleteReport()}
      />
    </div>
  );
}
