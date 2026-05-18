import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, Bot, CheckCircle, Database, Key, Mail, RotateCcw, Save, Search, Settings, ShieldCheck, UserPlus, Users, XCircle } from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
import {
  cancelStaffInvitation,
  createStaffInvitation,
  expireStaleStaffInvitations,
  fetchAdminAppRuntimeStatus,
  fetchAdminAiStatus,
  fetchAdminEmailStatus,
  fetchClubAccessOverview,
  fetchStaffAccessEvents,
  fetchStaffInvitations,
  fetchUserSettings,
  issueStaffInvitationLink,
  resendStaffInvitation,
  saveUserClubAccess,
  saveUserSettings,
  userHasRole,
  type AdminAiStatus,
  type AdminAppRuntimeStatus,
  type AdminEmailStatus,
  type ClubAccessOverview,
  type StaffAccessEventRecord,
  type StaffInvitationRecord,
} from '../lib/data';
import {
  buildInviteDeliveryNotice,
  buildInviteShareText,
  buildWhatsAppShareUrl,
  roleRequiresTeam,
  type InviteDeliveryMode,
} from '../lib/inviteDomain';
import { buildAppRuntimeSummary, formatRuntimeContextLabel } from '../lib/appRuntimeDomain';
import {
  buildClubAccessActionLabels,
  normalizeClubAccessSelection,
  validateClubAccessSelection,
} from '../lib/staffAccessDomain';
import { buildLaunchReadiness } from '../lib/settingsReadinessDomain';
import {
  buildStaffMaintenanceSummary,
  buildStaffOperationsMetrics,
  filterClubAccessUsers,
  filterStaffAccessEvents,
  filterStaffInvitations,
} from '../lib/staffOperationsDomain';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';

type ActivationLinkNotice = {
  tone: 'success' | 'warning';
  title: string;
  message: string;
  activationLink?: string;
  linkLabel?: string;
  email?: string;
  shareText?: string;
};

export default function SettingsPage() {
  const {
    football_api_provider,
    football_api_key,
    email_training_plan_published,
    email_training_td_comment,
    email_training_reminder,
    email_training_schedule_change,
    email_transport_updates,
    setSettings,
  } = useSettingsStore();
  const { user, logout } = useAuthStore();
  const isAdmin = userHasRole(user, 'admin');

  const [localProvider, setLocalProvider] = useState(football_api_provider);
  const [localApiKey, setLocalApiKey] = useState(football_api_key);
  const [notifyPlanPublished, setNotifyPlanPublished] = useState(email_training_plan_published);
  const [notifyTdComment, setNotifyTdComment] = useState(email_training_td_comment);
  const [notifyReminder, setNotifyReminder] = useState(email_training_reminder);
  const [notifyScheduleChange, setNotifyScheduleChange] = useState(email_training_schedule_change);
  const [notifyTransportUpdate, setNotifyTransportUpdate] = useState(email_transport_updates);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  const [clubAccess, setClubAccess] = useState<ClubAccessOverview | null>(null);
  const [staffInvitations, setStaffInvitations] = useState<StaffInvitationRecord[]>([]);
  const [staffAccessEvents, setStaffAccessEvents] = useState<StaffAccessEventRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleSlugs, setSelectedRoleSlugs] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [accessSuccess, setAccessSuccess] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleSlugs, setInviteRoleSlugs] = useState<string[]>([]);
  const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [invitationActionKey, setInvitationActionKey] = useState('');
  const [activationNotice, setActivationNotice] = useState<ActivationLinkNotice | null>(null);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('all');
  const [staffTeamFilter, setStaffTeamFilter] = useState('all');
  const [adminAiStatus, setAdminAiStatus] = useState<AdminAiStatus | null>(null);
  const [adminAiStatusLoading, setAdminAiStatusLoading] = useState(false);
  const [adminAiStatusError, setAdminAiStatusError] = useState('');
  const [adminAppRuntimeStatus, setAdminAppRuntimeStatus] = useState<AdminAppRuntimeStatus | null>(null);
  const [adminAppRuntimeStatusLoading, setAdminAppRuntimeStatusLoading] = useState(false);
  const [adminAppRuntimeStatusError, setAdminAppRuntimeStatusError] = useState('');
  const [adminEmailStatus, setAdminEmailStatus] = useState<AdminEmailStatus | null>(null);
  const [adminEmailStatusLoading, setAdminEmailStatusLoading] = useState(false);
  const [adminEmailStatusError, setAdminEmailStatusError] = useState('');
  const deferredStaffSearchQuery = useDeferredValue(staffSearchQuery);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        setAccessLoading(isAdmin);
        const settingsData = await fetchUserSettings();

        if (!isMounted) return;

        setSettings(settingsData);
        setLocalProvider(settingsData.football_api_provider);
        setLocalApiKey(settingsData.football_api_key);
        setNotifyPlanPublished(settingsData.email_training_plan_published);
        setNotifyTdComment(settingsData.email_training_td_comment);
        setNotifyReminder(settingsData.email_training_reminder);
        setNotifyScheduleChange(settingsData.email_training_schedule_change);
        setNotifyTransportUpdate(settingsData.email_transport_updates);

        if (isAdmin) {
          setAdminAiStatusLoading(true);
          setAdminAppRuntimeStatusLoading(true);
          setAdminEmailStatusLoading(true);
          const [clubAccessResult, invitationResult, accessEventsResult, adminAiStatusResult, adminAppRuntimeStatusResult, adminEmailStatusResult] = await Promise.allSettled([
            fetchClubAccessOverview(),
            fetchStaffInvitations(),
            fetchStaffAccessEvents(),
            fetchAdminAiStatus(),
            fetchAdminAppRuntimeStatus(),
            fetchAdminEmailStatus(),
          ]);

          if (!isMounted) return;

          if (clubAccessResult.status === 'fulfilled') {
            setClubAccess(clubAccessResult.value);
            const firstUserId = clubAccessResult.value.users[0]?.id || '';
            setSelectedUserId(firstUserId);
          } else {
            setAccessError(clubAccessResult.reason?.message || 'Failed to load club access.');
          }

          if (invitationResult.status === 'fulfilled') {
            setStaffInvitations(invitationResult.value);
          } else {
            setInviteError(invitationResult.reason?.message || 'Failed to load invitations.');
          }

          if (accessEventsResult.status === 'fulfilled') {
            setStaffAccessEvents(accessEventsResult.value);
          } else {
            setAccessError(accessEventsResult.reason?.message || 'Failed to load access activity.');
          }

          if (adminAiStatusResult.status === 'fulfilled') {
            setAdminAiStatus(adminAiStatusResult.value);
            setAdminAiStatusError('');
          } else {
            setAdminAiStatus(null);
            setAdminAiStatusError(adminAiStatusResult.reason?.message || 'Failed to load Admin AI status.');
          }

          if (adminAppRuntimeStatusResult.status === 'fulfilled') {
            setAdminAppRuntimeStatus(adminAppRuntimeStatusResult.value);
            setAdminAppRuntimeStatusError('');
          } else {
            setAdminAppRuntimeStatus(null);
            setAdminAppRuntimeStatusError(adminAppRuntimeStatusResult.reason?.message || 'Failed to load runtime status.');
          }

          if (adminEmailStatusResult.status === 'fulfilled') {
            setAdminEmailStatus(adminEmailStatusResult.value);
            setAdminEmailStatusError('');
          } else {
            setAdminEmailStatus(null);
            setAdminEmailStatusError(adminEmailStatusResult.reason?.message || 'Failed to load invite email status.');
          }
        } else {
          setAdminAiStatus(null);
          setAdminAiStatusError('');
          setAdminAppRuntimeStatus(null);
          setAdminAppRuntimeStatusError('');
          setAdminAppRuntimeStatusLoading(false);
          setAdminEmailStatus(null);
          setAdminEmailStatusError('');
          setAdminEmailStatusLoading(false);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load settings.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setAccessLoading(false);
          setAdminAiStatusLoading(false);
          setAdminAppRuntimeStatusLoading(false);
          setAdminEmailStatusLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, setSettings]);

  const selectedUser = useMemo(
    () => clubAccess?.users.find((candidate) => candidate.id === selectedUserId) || null,
    [clubAccess, selectedUserId],
  );

  useEffect(() => {
    if (!selectedUser) {
      setSelectedRoleSlugs([]);
      setSelectedTeamIds([]);
      return;
    }

    setSelectedRoleSlugs(selectedUser.roles.map((role) => role.slug));
    setSelectedTeamIds(selectedUser.teams.map((team) => team.id));
  }, [selectedUser]);

  const inviteNeedsTeam = useMemo(
    () => inviteRoleSlugs.some((roleSlug) => roleRequiresTeam(roleSlug)),
    [inviteRoleSlugs],
  );

  const selectedTeamFilterName = useMemo(() => {
    if (staffTeamFilter === 'all') return 'all';
    return clubAccess?.teams.find((team) => team.id === staffTeamFilter)?.name || 'all';
  }, [clubAccess?.teams, staffTeamFilter]);

  const staffOperationsMetrics = useMemo(
    () =>
      buildStaffOperationsMetrics({
        users: clubAccess?.users || [],
        invitations: staffInvitations,
        events: staffAccessEvents,
      }),
    [clubAccess?.users, staffAccessEvents, staffInvitations],
  );

  const staffMaintenanceSummary = useMemo(
    () =>
      buildStaffMaintenanceSummary({
        users: clubAccess?.users || [],
        invitations: staffInvitations,
      }),
    [clubAccess?.users, staffInvitations],
  );

  const filteredStaffUsers = useMemo(
    () =>
      filterClubAccessUsers(clubAccess?.users || [], {
        query: deferredStaffSearchQuery,
        roleSlug: staffRoleFilter,
        teamName: selectedTeamFilterName,
      }),
    [clubAccess?.users, deferredStaffSearchQuery, selectedTeamFilterName, staffRoleFilter],
  );

  const filteredPendingInvitations = useMemo(
    () =>
      filterStaffInvitations(staffInvitations, {
        query: deferredStaffSearchQuery,
        roleSlug: staffRoleFilter,
        teamName: selectedTeamFilterName,
        statusScope: 'pending',
      }),
    [deferredStaffSearchQuery, selectedTeamFilterName, staffRoleFilter, staffInvitations],
  );

  const filteredInvitationHistory = useMemo(
    () =>
      filterStaffInvitations(staffInvitations, {
        query: deferredStaffSearchQuery,
        roleSlug: staffRoleFilter,
        teamName: selectedTeamFilterName,
        statusScope: 'history',
      }),
    [deferredStaffSearchQuery, selectedTeamFilterName, staffRoleFilter, staffInvitations],
  );

  const filteredStaffAccessEvents = useMemo(
    () =>
      filterStaffAccessEvents(staffAccessEvents, {
        query: deferredStaffSearchQuery,
        roleSlug: staffRoleFilter,
        teamName: selectedTeamFilterName,
        tone: 'all',
      }),
    [deferredStaffSearchQuery, selectedTeamFilterName, staffAccessEvents, staffRoleFilter],
  );

  const likelyTestUserIds = useMemo(
    () => new Set(staffMaintenanceSummary.likelyTestUsers.map((member) => member.id)),
    [staffMaintenanceSummary.likelyTestUsers],
  );

  const likelyTestInvitationIds = useMemo(
    () => new Set(staffMaintenanceSummary.likelyTestInvitations.map((invitation) => invitation.id)),
    [staffMaintenanceSummary.likelyTestInvitations],
  );

  const selectedUserOutsideFilters = useMemo(
    () => Boolean(selectedUser && !filteredStaffUsers.some((member) => member.id === selectedUser.id)),
    [filteredStaffUsers, selectedUser],
  );

  const clubAccessActionLabels = useMemo(
    () => buildClubAccessActionLabels({ roleSlugs: selectedRoleSlugs, teamIds: selectedTeamIds }),
    [selectedRoleSlugs, selectedTeamIds],
  );

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  );

  const publicAppUrl = useMemo(() => {
    const runtimeAppUrl = adminAppRuntimeStatus?.publicAppUrl?.trim();
    if (runtimeAppUrl && runtimeAppUrl.length > 0) {
      return runtimeAppUrl.replace(/\/$/, '');
    }

    const explicitAppUrl = import.meta.env.VITE_APP_URL?.trim();
    if (explicitAppUrl && explicitAppUrl.length > 0) {
      return explicitAppUrl.replace(/\/$/, '');
    }

    if (typeof window !== 'undefined') {
      return window.location.origin.replace(/\/$/, '');
    }

    return '';
  }, [adminAppRuntimeStatus?.publicAppUrl]);

  const appRuntimeSummary = useMemo(
    () => buildAppRuntimeSummary(adminAppRuntimeStatus),
    [adminAppRuntimeStatus],
  );

  const launchReadiness = useMemo(
    () =>
      isAdmin && !adminAiStatusLoading && !adminEmailStatusLoading
        ? buildLaunchReadiness({
            publicAppUrl,
            footballApiProvider: localProvider,
            footballApiKey: localApiKey,
            adminAiStatus,
            adminEmailStatus,
          })
        : null,
    [adminAiStatus, adminAiStatusLoading, adminEmailStatus, adminEmailStatusLoading, isAdmin, localApiKey, localProvider, publicAppUrl],
  );

  const refreshClubAccessData = async (preserveSelectedUserId?: string) => {
    const [clubAccessResult, invitationResult, accessEventsResult] = await Promise.allSettled([
      fetchClubAccessOverview(),
      fetchStaffInvitations(),
      fetchStaffAccessEvents(),
    ]);

    if (clubAccessResult.status === 'fulfilled') {
      setClubAccess(clubAccessResult.value);

      const nextSelectedUserId =
        preserveSelectedUserId && clubAccessResult.value.users.some((member) => member.id === preserveSelectedUserId)
          ? preserveSelectedUserId
          : clubAccessResult.value.users[0]?.id || '';

      setSelectedUserId(nextSelectedUserId);
      setAccessError('');
    } else {
      setAccessError(clubAccessResult.reason?.message || 'Failed to refresh club access.');
    }

    if (invitationResult.status === 'fulfilled') {
      setStaffInvitations(invitationResult.value);
      setInviteError('');
    } else {
      setInviteError(invitationResult.reason?.message || 'Failed to refresh invitations.');
    }

    if (accessEventsResult.status === 'fulfilled') {
      setStaffAccessEvents(accessEventsResult.value);
    } else {
      setAccessError(accessEventsResult.reason?.message || 'Failed to refresh access activity.');
    }
  };

  const copyActivationLink = async (activationLink: string) => {
    try {
      await navigator.clipboard.writeText(activationLink);
      return true;
    } catch (error) {
      console.error('Failed to copy activation link.', error);
      window.prompt('Copy this activation link manually:', activationLink);
      return false;
    }
  };

  const openWhatsAppShare = (message: string) => {
    const whatsappUrl = buildWhatsAppShareUrl(message);
    const popup = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      window.location.href = whatsappUrl;
    }
  };

  const enrichActivationMessage = (message: string, activationLink?: string) => {
    if (!activationLink) {
      return message;
    }

    const decodedLink = decodeURIComponent(activationLink);
    if (decodedLink.includes('/auth/v1/verify') && !decodedLink.includes('/accept-invite')) {
      return `${message} If the link opens the wrong URL, add the current /accept-invite address to Supabase Redirect URLs.`;
    }

    return message;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError('');
    try {
      const nextSettings = {
        football_api_provider: localProvider,
        football_api_key: localApiKey,
        email_training_plan_published: notifyPlanPublished,
        email_training_td_comment: notifyTdComment,
        email_training_reminder: notifyReminder,
        email_training_schedule_change: notifyScheduleChange,
        email_transport_updates: notifyTransportUpdate,
      };
      await saveUserSettings(nextSettings);
      setSettings(nextSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRole = (roleSlug: string) => {
    setSelectedRoleSlugs((current) =>
      current.includes(roleSlug) ? current.filter((item) => item !== roleSlug) : [...current, roleSlug],
    );
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((current) =>
      current.includes(teamId) ? current.filter((item) => item !== teamId) : [...current, teamId],
    );
  };

  const toggleInviteRole = (roleSlug: string) => {
    setInviteRoleSlugs((current) =>
      current.includes(roleSlug) ? current.filter((item) => item !== roleSlug) : [...current, roleSlug],
    );
  };

  const toggleInviteTeam = (teamId: string) => {
    setInviteTeamIds((current) =>
      current.includes(teamId) ? current.filter((item) => item !== teamId) : [...current, teamId],
    );
  };

  const commitClubAccess = async (nextSelection?: { roleSlugs: string[]; teamIds: string[] }) => {
    if (!selectedUserId) return;

    setAccessLoading(true);
    setAccessError('');
    setAccessSuccess(false);
    try {
      const normalizedSelection = validateClubAccessSelection(
        normalizeClubAccessSelection(
          nextSelection || {
            roleSlugs: selectedRoleSlugs,
            teamIds: selectedTeamIds,
          },
        ),
      );

      await saveUserClubAccess(selectedUserId, normalizedSelection.roleSlugs, normalizedSelection.teamIds);
      await refreshClubAccessData(selectedUserId);
      setAccessSuccess(true);
      setTimeout(() => setAccessSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save club access.', err);
      setAccessError(err.message || 'Failed to save club access.');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleSaveAccess = async () => {
    await commitClubAccess();
  };

  const handleClearAccess = async () => {
    if (!selectedUser) return;

    const confirmed = window.confirm(
      `Remove all club roles and team assignments for ${selectedUser.name}? They will still exist in Authentication, but they will no longer have access until an admin assigns roles again.`,
    );

    if (!confirmed) {
      return;
    }

    await commitClubAccess({ roleSlugs: [], teamIds: [] });
  };

  const resetInviteForm = () => {
    setInviteName('');
    setInviteEmail('');
    setInviteRoleSlugs([]);
    setInviteTeamIds([]);
  };

  const buildShareTextForInvite = (input: {
    fullName: string;
    roleLabels: string[];
    teamNames: string[];
    shareUrl: string;
    existingUser?: boolean;
  }) =>
    buildInviteShareText({
      fullName: input.fullName,
      roleLabels: input.roleLabels,
      teamNames: input.teamNames,
      shareUrl: input.shareUrl,
      existingUser: input.existingUser,
    });

  const handleSendInvite = async (deliveryMode: InviteDeliveryMode) => {
    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');
    setActivationNotice(null);
    const inviteSnapshot = {
      fullName: inviteName.trim(),
      email: inviteEmail.trim(),
      roleLabels:
        clubAccess?.roles
          .filter((role) => inviteRoleSlugs.includes(role.slug))
          .map((role) => role.label) || [],
      teamNames:
        clubAccess?.teams
          .filter((team) => inviteTeamIds.includes(team.id))
          .map((team) => team.name) || [],
    };
    try {
      const response = await createStaffInvitation({
        fullName: inviteSnapshot.fullName,
        email: inviteSnapshot.email,
        roleSlugs: inviteRoleSlugs,
        teamIds: inviteTeamIds,
        deliveryMode,
      });

      await refreshClubAccessData(selectedUserId);
      resetInviteForm();
      const shareUrl =
        response.activationLink ||
        response.shareLink ||
        (response.mode === 'existing_user' ? `${publicAppUrl}/login` : undefined);
      const shareText =
        shareUrl && inviteSnapshot.fullName
          ? buildShareTextForInvite({
              fullName: inviteSnapshot.fullName,
              roleLabels: inviteSnapshot.roleLabels,
              teamNames: inviteSnapshot.teamNames,
              shareUrl,
              existingUser: response.mode === 'existing_user',
            })
          : undefined;
      const notice = buildInviteDeliveryNotice({
        mode: response.mode,
        delivery: response.delivery,
        deliveryMode,
        hasActivationLink: Boolean(shareUrl),
      });
      setInviteSuccess(notice.title);
      setActivationNotice({
        tone: notice.tone,
        title: notice.title,
        message: enrichActivationMessage(notice.message, shareUrl),
        activationLink: shareUrl,
        linkLabel:
          response.mode === 'existing_user' && !response.activationLink ? 'Login link' : 'Activation link',
        email: inviteSnapshot.email,
        shareText,
      });
      if (deliveryMode === 'whatsapp_share' && shareText) {
        openWhatsAppShare(shareText);
      }
      setTimeout(() => setInviteSuccess(''), 4000);
    } catch (err: any) {
      console.error('Failed to invite staff member.', err);
      setInviteError(err.message || 'Failed to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    setInvitationActionKey(`resend:${invitationId}`);
    setInviteError('');
    setInviteSuccess('');
    setActivationNotice(null);
    try {
      const response = await resendStaffInvitation(invitationId);
      await refreshClubAccessData(selectedUserId);
      const invitation = staffInvitations.find((item) => item.id === invitationId);
      const shareUrl = response.activationLink || response.shareLink;
      const shareText =
        shareUrl && invitation
          ? buildShareTextForInvite({
              fullName: invitation.fullName,
              roleLabels: invitation.roles.map((role) => role.label),
              teamNames: invitation.teams.map((team) => team.name),
              shareUrl,
            })
          : undefined;
      const notice = response.delivery
        ? buildInviteDeliveryNotice({
            mode: 'new_user',
            delivery: response.delivery,
            deliveryMode: 'email',
            hasActivationLink: Boolean(shareUrl),
          })
        : null;
      setInviteSuccess(notice?.title || response.message);
      if (notice) {
        setActivationNotice({
          tone: notice.tone,
          title: notice.title,
          message: enrichActivationMessage(notice.message, shareUrl),
          activationLink: shareUrl,
          linkLabel: 'Activation link',
          email: invitation?.email,
          shareText,
        });
      }
      setTimeout(() => setInviteSuccess(''), 4000);
    } catch (err: any) {
      console.error('Failed to resend invitation.', err);
      setInviteError(err.message || 'Failed to resend invitation.');
    } finally {
      setInvitationActionKey('');
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    setInvitationActionKey(`cancel:${invitationId}`);
    setInviteError('');
    setInviteSuccess('');
    setActivationNotice(null);
    try {
      const response = await cancelStaffInvitation(invitationId);
      await refreshClubAccessData(selectedUserId);
      setInviteSuccess(response.message);
      setTimeout(() => setInviteSuccess(''), 4000);
    } catch (err: any) {
      console.error('Failed to cancel invitation.', err);
      setInviteError(err.message || 'Failed to cancel invitation.');
    } finally {
      setInvitationActionKey('');
    }
  };

  const handleExpireStaleInvites = async () => {
    setInvitationActionKey('expire-stale');
    setInviteError('');
    setInviteSuccess('');
    setActivationNotice(null);
    try {
      const response = await expireStaleStaffInvitations();
      await refreshClubAccessData(selectedUserId);
      setInviteSuccess(response.message);
      setTimeout(() => setInviteSuccess(''), 4000);
    } catch (err: any) {
      console.error('Failed to expire stale invitations.', err);
      setInviteError(err.message || 'Failed to expire stale invitations.');
    } finally {
      setInvitationActionKey('');
    }
  };

  const handleCopyInviteLink = async (invitationId: string) => {
    setInvitationActionKey(`copy:${invitationId}`);
    setInviteError('');
    setInviteSuccess('');
    try {
      const response = await issueStaffInvitationLink(invitationId);
      const invitation = staffInvitations.find((item) => item.id === invitationId);
      const copied = await copyActivationLink(response.activationLink);
      const shareText =
        invitation
          ? buildShareTextForInvite({
              fullName: invitation.fullName,
              roleLabels: invitation.roles.map((role) => role.label),
              teamNames: invitation.teams.map((team) => team.name),
              shareUrl: response.activationLink,
            })
          : undefined;
      setActivationNotice({
        tone: 'warning',
        title: copied ? 'Activation link copied' : 'Activation link ready',
        message: enrichActivationMessage(
          copied
            ? 'Send the copied activation link manually if email delivery is not available yet.'
            : 'Copy and send the activation link manually from the dialog shown.',
          response.activationLink,
        ),
        activationLink: response.activationLink,
        linkLabel: 'Activation link',
        email: invitation?.email,
        shareText,
      });
      setInviteSuccess(response.message);
      setTimeout(() => setInviteSuccess(''), 4000);
    } catch (err: any) {
      console.error('Failed to issue activation link.', err);
      setInviteError(err.message || 'Failed to generate activation link.');
    } finally {
      setInvitationActionKey('');
    }
  };

  const handleShareInviteOnWhatsApp = async (invitationId: string) => {
    setInvitationActionKey(`share:${invitationId}`);
    setInviteError('');
    setInviteSuccess('');
    try {
      const response = await issueStaffInvitationLink(invitationId);
      const invitation = staffInvitations.find((item) => item.id === invitationId);
      if (!invitation) {
        throw new Error('Invitation details are no longer available.');
      }

      const shareText = buildShareTextForInvite({
        fullName: invitation.fullName,
        roleLabels: invitation.roles.map((role) => role.label),
        teamNames: invitation.teams.map((team) => team.name),
        shareUrl: response.activationLink,
      });

      setActivationNotice({
        tone: 'success',
        title: 'WhatsApp share ready',
        message: enrichActivationMessage(
          'The activation link is ready and was prepared for WhatsApp. If WhatsApp does not open, copy the link below and send it manually.',
          response.activationLink,
        ),
        activationLink: response.activationLink,
        linkLabel: 'Activation link',
        email: invitation.email,
        shareText,
      });
      openWhatsAppShare(shareText);
      setInviteSuccess('WhatsApp share prepared.');
      setTimeout(() => setInviteSuccess(''), 4000);
    } catch (err: any) {
      console.error('Failed to prepare WhatsApp share.', err);
      setInviteError(err.message || 'Failed to prepare WhatsApp share.');
    } finally {
      setInvitationActionKey('');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-light)] flex flex-col md:flex-row">
      <AppSidebar current="settings" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface relative overflow-hidden px-4 py-4 text-white md:px-6 md:py-5">
              <div className="flex items-center gap-3 border-b border-white/10 pb-3 md:gap-4 md:pb-4">
                <img
                  src="/branding/mwos-fc-300-2.png"
                  alt="MWOS logo"
                  className="h-10 w-10 rounded-full border border-white/20 bg-white/10 p-0.5 md:h-12 md:w-12"
                />
              </div>
              <div className="mt-4 flex items-center gap-3 md:mt-5 md:gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white md:h-11 md:w-11">
                  <Settings size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/65">MWOS Club Workspace</p>
                  <h1 className="mt-1 mwos-display text-[2rem] uppercase leading-none tracking-[0.08em] text-white md:text-4xl">
                    Settings
                  </h1>
                  <p className="mt-1.5 text-xs font-semibold text-white/75 md:mt-2 md:text-sm">
                    Manage integrations and, for admins, assign club roles and teams.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
            <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/20 bg-white shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
              <div className="border-b border-[var(--color-mid)]/20 bg-[var(--color-light)]/50 p-4 md:p-5">
                <h2 className="flex items-center text-base font-black uppercase tracking-wider text-[var(--color-dark)]">
                  <Database size={18} className="mr-2 text-[var(--color-primary)]" />
                  Data Provider Integration
                </h2>
                <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                  Choose how squad data is imported for reports.
                </p>
              </div>

              <div className="space-y-4 p-4 md:space-y-5 md:p-5">
                {isLoading && (
                  <div className="rounded-xl border border-[var(--color-mid)]/20 bg-[var(--color-light)] p-4 text-sm font-semibold text-[var(--color-mid)]">
                    Loading settings...
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-mid)]">
                    Football Data Provider
                  </label>
                  <select
                    value={localProvider}
                    onChange={(e) => setLocalProvider(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--color-mid)]/30 bg-white p-3 font-bold outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                  >
                    <option value="api-football">API-Football (api-football.com)</option>
                    <option value="none">None (Manual Entry Only)</option>
                  </select>
                </div>

                {localProvider === 'api-football' && (
                  <div>
                    <label className="mb-2 flex items-center text-xs font-bold uppercase tracking-wider text-[var(--color-mid)]">
                      <Key size={14} className="mr-1" /> API Key
                    </label>
                    <input
                      type="password"
                      value={localApiKey}
                      onChange={(e) => setLocalApiKey(e.target.value)}
                      placeholder="Enter your API-Football key"
                      className="w-full rounded-2xl border border-[var(--color-mid)]/30 bg-white p-3 font-mono text-sm outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                    <p className="mt-2 text-xs text-[var(--color-mid)]">
                      Get your API key from{' '}
                      <a href="https://dashboard.api-football.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">
                        dashboard.api-football.com
                      </a>
                      .
                    </p>
                  </div>
                )}

                <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-[var(--color-light)]/45 p-4">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-[var(--color-primary)]" />
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-dark)]">
                      Important Email Alerts
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-6 text-[var(--color-mid)]">
                    In-app notifications are always kept in the workspace. These toggles decide which important training and transport events should also arrive by email.
                  </p>

                  <div className="mt-4 space-y-3">
                    {[
                      {
                        label: 'Training plan published',
                        description: 'Receive email when a weekly training plan is first published.',
                        value: notifyPlanPublished,
                        onChange: setNotifyPlanPublished,
                      },
                      {
                        label: 'Technical Director comments',
                        description: 'Receive email when the Technical Director comments on a training plan.',
                        value: notifyTdComment,
                        onChange: setNotifyTdComment,
                      },
                      {
                        label: '30 minute training reminders',
                        description: 'Receive email shortly before a training session starts.',
                        value: notifyReminder,
                        onChange: setNotifyReminder,
                      },
                      {
                        label: 'Major schedule changes',
                        description: 'Receive email when a published session time, date or location changes.',
                        value: notifyScheduleChange,
                        onChange: setNotifyScheduleChange,
                      },
                      {
                        label: 'Transport updates',
                        description: 'Receive email when a transport plan is created or materially updated.',
                        value: notifyTransportUpdate,
                        onChange: setNotifyTransportUpdate,
                      },
                    ].map((item) => (
                      <label
                        key={item.label}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-white/70 bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[var(--color-dark)]">{item.label}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                            {item.description}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={item.value}
                          onChange={(event) => item.onChange(event.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-[var(--color-mid)]/30 accent-[var(--color-primary)]"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-[var(--color-light)]/45 p-4">
                    <div className="flex items-center gap-2">
                      <Bot size={16} className="text-[var(--color-primary)]" />
                      <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-dark)]">
                        Admin AI Integration
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-6 text-[var(--color-mid)]">
                      The admin dashboard uses Gemini for leadership insights and chat. This status checks the server-side integration used by Netlify.
                    </p>

                    <div className="mt-4 rounded-2xl border border-white/70 bg-white px-4 py-4">
                      {adminAiStatusLoading ? (
                        <p className="text-sm font-semibold text-[var(--color-mid)]">Checking Admin AI readiness...</p>
                      ) : adminAiStatusError ? (
                        <p className="text-sm font-semibold text-red-700">{adminAiStatusError}</p>
                      ) : adminAiStatus ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${
                                adminAiStatus.configured
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {adminAiStatus.configured ? 'Configured' : 'Needs setup'}
                            </span>
                            <span className="rounded-full bg-[var(--color-light)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-dark)]">
                              {adminAiStatus.provider} · {adminAiStatus.model}
                            </span>
                            {adminAiStatus.configuredEnvVar ? (
                              <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">
                                {adminAiStatus.configuredEnvVar}
                              </span>
                            ) : null}
                          </div>

                          <p className="text-sm font-semibold leading-6 text-[var(--color-dark)]/80">
                            {adminAiStatus.setupHint}
                          </p>

                          {!adminAiStatus.configured && adminAiStatus.acceptedEnvVars.length > 0 && (
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">
                              Accepted env vars: {adminAiStatus.acceptedEnvVars.join(' or ')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-[var(--color-mid)]">
                          Admin AI status is unavailable right now.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-[var(--color-light)]/45 p-4">
                    <div className="flex items-center gap-2">
                      <Database size={16} className="text-[var(--color-primary)]" />
                      <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-dark)]">
                        Deployment Runtime
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-6 text-[var(--color-mid)]">
                      This shows which runtime the current admin surface is talking to, which branch/build it belongs to, and whether public invite/reset links are aligned with that deployment.
                    </p>

                    <div className="mt-4 rounded-2xl border border-white/70 bg-white px-4 py-4">
                      {adminAppRuntimeStatusLoading ? (
                        <p className="text-sm font-semibold text-[var(--color-mid)]">Checking deployment runtime...</p>
                      ) : adminAppRuntimeStatusError ? (
                        <p className="text-sm font-semibold text-red-700">{adminAppRuntimeStatusError}</p>
                      ) : adminAppRuntimeStatus ? (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${
                                appRuntimeSummary.tone === 'ready'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {appRuntimeSummary.tone === 'ready' ? 'Runtime aligned' : 'Needs review'}
                            </span>
                            <span className="rounded-full bg-[var(--color-light)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-dark)]">
                              {formatRuntimeContextLabel(adminAppRuntimeStatus.context)}
                            </span>
                            {adminAppRuntimeStatus.branch ? (
                              <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">
                                {adminAppRuntimeStatus.branch}
                              </span>
                            ) : null}
                            {adminAppRuntimeStatus.branchMatchesRelease === false && adminAppRuntimeStatus.releaseBranch ? (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">
                                Release branch: {adminAppRuntimeStatus.releaseBranch}
                              </span>
                            ) : null}
                          </div>

                          <div>
                            <p className="text-base font-black text-[var(--color-dark)]">{appRuntimeSummary.headline}</p>
                            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-dark)]/80">
                              {appRuntimeSummary.detail}
                            </p>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-[var(--color-light)]/65 px-4 py-3">
                              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">Configured public app URL</p>
                              <p className="mt-2 break-all text-sm font-semibold text-[var(--color-dark)]">
                                {adminAppRuntimeStatus.publicAppUrl || 'Not configured yet'}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-[var(--color-light)]/65 px-4 py-3">
                              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">Recommended URL for this runtime</p>
                              <p className="mt-2 break-all text-sm font-semibold text-[var(--color-dark)]">
                                {adminAppRuntimeStatus.recommendedPublicUrl || 'Not detected'}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-[var(--color-light)]/65 px-4 py-3">
                              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">Site URL</p>
                              <p className="mt-2 break-all text-sm font-semibold text-[var(--color-dark)]">
                                {adminAppRuntimeStatus.siteUrl || 'Not exposed in this runtime'}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-[var(--color-light)]/65 px-4 py-3">
                              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">Preview / deploy URL</p>
                              <p className="mt-2 break-all text-sm font-semibold text-[var(--color-dark)]">
                                {adminAppRuntimeStatus.deployPrimeUrl || 'Not applicable'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--color-mid)]">
                            <span>Branch: {adminAppRuntimeStatus.branch || 'Unknown'}</span>
                            <span>•</span>
                            <span>Commit: {adminAppRuntimeStatus.commitRef?.slice(0, 8) || 'Unknown'}</span>
                            <span>•</span>
                            <span>
                              Public URL match:{' '}
                              {adminAppRuntimeStatus.matchesRecommendedPublicUrl ? 'yes' : 'no'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-[var(--color-mid)]">
                          Runtime status is unavailable right now.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-[var(--color-light)]/45 p-4">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-[var(--color-primary)]" />
                      <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-dark)]">
                        Invite & Alert Delivery
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-6 text-[var(--color-mid)]">
                      This checks whether invite emails and important training/transport alerts can leave the Netlify runtime, or whether the club should keep using manual links and WhatsApp sharing for now.
                    </p>

                    <div className="mt-4 rounded-2xl border border-white/70 bg-white px-4 py-4">
                      {adminEmailStatusLoading ? (
                        <p className="text-sm font-semibold text-[var(--color-mid)]">Checking invite delivery readiness...</p>
                      ) : adminEmailStatusError ? (
                        <p className="text-sm font-semibold text-red-700">{adminEmailStatusError}</p>
                      ) : adminEmailStatus ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${
                                adminEmailStatus.configured
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {adminEmailStatus.configured ? 'Email delivery ready' : 'Manual-link mode'}
                            </span>
                            <span className="rounded-full bg-[var(--color-light)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-dark)]">
                              {adminEmailStatus.deliveryMode === 'transactional_email' ? 'Transactional email' : 'Manual share fallback'}
                            </span>
                          </div>

                          <p className="text-sm font-semibold leading-6 text-[var(--color-dark)]/80">
                            {adminEmailStatus.setupHint}
                          </p>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-[var(--color-light)]/65 px-4 py-3">
                              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">Sender</p>
                              <p className="mt-2 text-sm font-semibold text-[var(--color-dark)]">
                                {adminEmailStatus.sender || 'Not configured yet'}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-[var(--color-light)]/65 px-4 py-3">
                              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">Public app URL</p>
                              <p className="mt-2 break-all text-sm font-semibold text-[var(--color-dark)]">
                                {adminEmailStatus.publicAppUrl || 'Not configured yet'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-[var(--color-mid)]">
                          Delivery status is unavailable right now.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {isAdmin && launchReadiness && (
                  <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-[var(--color-light)]/45 p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[var(--color-primary)]" />
                      <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-dark)]">
                        Launch Readiness
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-6 text-[var(--color-mid)]">
                      Use this as the admin truth source before onboarding staff broadly. It combines the public app URL, invite delivery mode, squad import setup and Admin AI readiness into one honest verdict.
                    </p>

                    <div className="mt-4 rounded-2xl border border-white/70 bg-white px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${
                                launchReadiness.tone === 'ready'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {launchReadiness.tone === 'ready' ? 'Operational' : 'Needs attention'}
                            </span>
                            {launchReadiness.blockingCount > 0 ? (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-red-800">
                                {launchReadiness.blockingCount} blocking
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 text-lg font-black text-[var(--color-dark)]">{launchReadiness.headline}</p>
                          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--color-dark)]/80">
                            {launchReadiness.detail}
                          </p>
                        </div>

                        <div className="grid min-w-[220px] gap-3 sm:grid-cols-3">
                          {[
                            { label: 'Ready', value: launchReadiness.readyCount, tone: 'emerald' },
                            { label: 'Attention', value: launchReadiness.attentionCount, tone: 'amber' },
                            { label: 'Optional', value: launchReadiness.optionalCount, tone: 'slate' },
                          ].map((metric) => (
                            <div key={metric.label} className="rounded-2xl bg-[var(--color-light)]/65 px-4 py-3 text-center">
                              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
                                {metric.label}
                              </p>
                              <p
                                className={`mt-2 text-2xl font-black ${
                                  metric.tone === 'emerald'
                                    ? 'text-emerald-700'
                                    : metric.tone === 'amber'
                                      ? 'text-amber-700'
                                      : 'text-[var(--color-dark)]'
                                }`}
                              >
                                {metric.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 lg:grid-cols-2">
                        {launchReadiness.items.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-[var(--color-mid)]/14 bg-[var(--color-light)]/45 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${
                                  item.tone === 'ready'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.tone === 'attention'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {item.statusLabel}
                              </span>
                              {item.blocking ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-red-800">
                                  <AlertTriangle size={12} />
                                  Blocking
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-3 text-sm font-black text-[var(--color-dark)]">{item.label}</p>
                            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-dark)]/80">{item.detail}</p>
                            <p className="mt-3 text-xs font-semibold leading-5 text-[var(--color-mid)]">{item.action}</p>
                          </div>
                        ))}
                      </div>

                      {launchReadiness.nextSteps.length > 0 ? (
                        <div className="mt-5 rounded-2xl border border-[var(--color-mid)]/14 bg-[var(--color-light)]/55 p-4">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                            Next admin steps
                          </p>
                          <div className="mt-3 space-y-2">
                            {launchReadiness.nextSteps.slice(0, 4).map((step) => (
                              <p key={step} className="text-sm font-semibold leading-6 text-[var(--color-dark)]/80">
                                {step}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-[var(--color-mid)]/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {saveSuccess && (
                      <span className="flex items-center text-sm font-bold text-green-600">
                        <CheckCircle size={16} className="mr-1" /> Settings saved successfully
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    className="rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-opacity-90 disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Save size={16} />
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </span>
                  </button>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/20 bg-white shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
              <div className="border-b border-[var(--color-mid)]/20 bg-[var(--color-light)]/50 p-4 md:p-5">
                <h2 className="flex items-center text-base font-black uppercase tracking-wider text-[var(--color-dark)]">
                  <ShieldCheck size={18} className="mr-2 text-[var(--color-primary)]" />
                  Club Access
                </h2>
                <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                  Assign staff roles and teams from one admin surface.
                </p>
              </div>

              <div className="p-4 md:p-5">
                {!isAdmin ? (
                  <div className="rounded-2xl border border-[var(--color-mid)]/16 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                    Club access management is visible only to admin accounts.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {accessError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                        {accessError}
                      </div>
                    )}

                    {inviteError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                        {inviteError}
                      </div>
                    )}

                    {inviteSuccess && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
                        {inviteSuccess}
                      </div>
                    )}

                    {activationNotice && (
                      <div
                        className={`rounded-2xl border p-4 ${
                          activationNotice.tone === 'success'
                            ? 'border-green-200 bg-green-50'
                            : 'border-amber-200 bg-amber-50'
                        }`}
                      >
                        <p
                          className={`text-sm font-black ${
                            activationNotice.tone === 'success' ? 'text-green-800' : 'text-amber-900'
                          }`}
                        >
                          {activationNotice.title}
                        </p>
                        <p
                          className={`mt-2 text-sm font-semibold leading-6 ${
                            activationNotice.tone === 'success' ? 'text-green-700' : 'text-amber-800'
                          }`}
                        >
                          {activationNotice.message}
                        </p>
                        {activationNotice.email && (
                          <p className="mt-2 text-xs font-semibold text-[var(--color-mid)]">
                            Target: {activationNotice.email}
                          </p>
                        )}
                        {activationNotice.activationLink && (
                          <div className="mt-4 flex flex-col gap-3">
                            <textarea
                              readOnly
                              value={activationNotice.activationLink}
                              className="min-h-[90px] w-full rounded-2xl border border-[var(--color-mid)]/20 bg-white p-3 text-xs font-semibold text-[var(--color-dark)] outline-none"
                            />
                            {activationNotice.linkLabel ? (
                              <p className="text-xs font-semibold text-[var(--color-mid)]">
                                {activationNotice.linkLabel}
                              </p>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void copyActivationLink(activationNotice.activationLink!)}
                                className="rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white shadow-sm"
                              >
                                Copy {activationNotice.linkLabel?.toLowerCase() || 'activation link'}
                              </button>
                              {activationNotice.shareText ? (
                                <button
                                  type="button"
                                  onClick={() => openWhatsAppShare(activationNotice.shareText!)}
                                  className="rounded-2xl border border-[var(--color-primary)]/18 bg-white px-4 py-2.5 text-sm font-bold text-[var(--color-primary)]"
                                >
                                  Share on WhatsApp
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => setActivationNotice(null)}
                                className="rounded-2xl border border-[var(--color-mid)]/20 bg-white px-4 py-2.5 text-sm font-bold text-[var(--color-dark)]"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-[var(--color-light)]/45 p-4">
                      <div className="flex flex-wrap items-start gap-3 lg:flex-nowrap lg:items-end">
                        <div className="min-w-[220px] flex-1">
                          <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                            Search staff operations
                          </label>
                          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 shadow-sm">
                            <Search size={16} className="text-[var(--color-mid)]" />
                            <input
                              type="text"
                              value={staffSearchQuery}
                              onChange={(event) => setStaffSearchQuery(event.target.value)}
                              placeholder="Search by staff name, email, role, or team"
                              className="w-full bg-transparent text-sm font-semibold text-[var(--color-dark)] outline-none placeholder:text-[var(--color-mid)]/70"
                            />
                          </div>
                        </div>

                        <div className="w-full sm:w-[220px]">
                          <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                            Role filter
                          </label>
                          <select
                            value={staffRoleFilter}
                            onChange={(event) => setStaffRoleFilter(event.target.value)}
                            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none shadow-sm"
                          >
                            <option value="all">All roles</option>
                            {clubAccess?.roles.map((role) => (
                              <option key={role.slug} value={role.slug}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-full sm:w-[220px]">
                          <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                            Team filter
                          </label>
                          <select
                            value={staffTeamFilter}
                            onChange={(event) => setStaffTeamFilter(event.target.value)}
                            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none shadow-sm"
                          >
                            <option value="all">All teams</option>
                            {clubAccess?.teams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {[
                          {
                            label: 'Active staff',
                            value: staffOperationsMetrics.activeStaffCount,
                            description: 'Accounts with at least one assigned club role.',
                          },
                          {
                            label: 'Pending invites',
                            value: staffOperationsMetrics.pendingInvitationCount,
                            description: 'Invites still waiting for activation.',
                          },
                          {
                            label: 'Multi-team staff',
                            value: staffOperationsMetrics.multiTeamStaffCount,
                            description: 'People covering more than one team.',
                          },
                          {
                            label: 'Recent changes',
                            value: staffOperationsMetrics.recentChangesCount,
                            description: 'Access actions recorded in the last 7 days.',
                          },
                          {
                            label: 'Stale invites',
                            value: staffOperationsMetrics.stalePendingInvitationCount,
                            description: 'Pending invites that already passed their activation window.',
                          },
                        ].map((card) => (
                          <div
                            key={card.label}
                            className="rounded-2xl border border-[var(--color-mid)]/14 bg-white p-4 shadow-[0_10px_24px_rgba(49,39,131,0.05)]"
                          >
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                              {card.label}
                            </p>
                            <p className="mt-3 text-3xl font-black text-[var(--color-dark)]">{card.value}</p>
                            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                              {card.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-[var(--color-primary)]" />
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-dark)]">
                          Maintenance & Cleanup
                        </p>
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                        This is the admin cleanup lane before live rollout. It surfaces stale pending invites and records that look like QA smoke data, but keeps destructive cleanup deliberate and outside one-click flows.
                      </p>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {[
                          {
                            label: 'Stale pending invites',
                            value: staffOperationsMetrics.stalePendingInvitationCount,
                            description: 'Invites that already passed their activation window.',
                          },
                          {
                            label: 'Likely test invites',
                            value: staffMaintenanceSummary.likelyTestInvitationCount,
                            description: 'Pending or historical invite records that look like QA or smoke data.',
                          },
                          {
                            label: 'Likely test accounts',
                            value: staffMaintenanceSummary.likelyTestUserCount,
                            description: 'Staff accounts that probably came from QA aliases or demo naming.',
                          },
                        ].map((card) => (
                          <div
                            key={card.label}
                            className="rounded-2xl border border-[var(--color-mid)]/14 bg-[var(--color-light)]/35 p-4"
                          >
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                              {card.label}
                            </p>
                            <p className="mt-3 text-3xl font-black text-[var(--color-dark)]">{card.value}</p>
                            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                              {card.description}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
                        <div className="rounded-2xl border border-[var(--color-mid)]/14 bg-[var(--color-light)]/35 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                            Cleanup playbook
                          </p>
                          <div className="mt-3 space-y-3 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                            <p>
                              1. Expire stale invites first. That removes them from the live pending queue without deleting audit history.
                            </p>
                            <p>
                              2. Review likely test invites and likely test accounts below before launch day, especially `+qa`, `+invite`, `+slice` or `Smoke` entries.
                            </p>
                            <p>
                              3. Keep destructive cleanup deliberate. Real deletions should happen only once the club confirms which records are safe to remove.
                            </p>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleExpireStaleInvites()}
                              disabled={
                                invitationActionKey === 'expire-stale' ||
                                staffOperationsMetrics.stalePendingInvitationCount === 0
                              }
                              className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 shadow-sm disabled:opacity-50"
                            >
                              {invitationActionKey === 'expire-stale' ? 'Cleaning…' : 'Expire stale invites now'}
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-[var(--color-mid)]/14 bg-[var(--color-light)]/35 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                              Likely test invites
                            </p>
                            <div className="mt-3 space-y-3">
                              {staffMaintenanceSummary.likelyTestInvitations.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/20 bg-white/70 p-4 text-sm font-semibold text-[var(--color-mid)]">
                                  No likely test invites detected right now.
                                </div>
                              ) : (
                                staffMaintenanceSummary.likelyTestInvitations.slice(0, 5).map((invitation) => (
                                  <div
                                    key={invitation.id}
                                    className="rounded-2xl border border-[var(--color-mid)]/14 bg-white/80 p-3"
                                  >
                                    <p className="text-sm font-black text-[var(--color-dark)]">{invitation.name}</p>
                                    <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">{invitation.email}</p>
                                    <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">
                                      {invitation.reasonLabels.join(' · ')}
                                    </p>
                                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                                      {(invitation.roleLabels.length > 0 ? invitation.roleLabels.join(' · ') : 'No roles') +
                                        (invitation.teamNames.length > 0 ? ` · ${invitation.teamNames.join(' · ')}` : '')}
                                    </p>
                                    {invitation.updatedAt ? (
                                      <p className="mt-1 text-[11px] font-semibold text-[var(--color-mid)]">
                                        Updated {dateTimeFormatter.format(new Date(invitation.updatedAt))}
                                      </p>
                                    ) : null}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-[var(--color-mid)]/14 bg-[var(--color-light)]/35 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                              Likely test accounts
                            </p>
                            <div className="mt-3 space-y-3">
                              {staffMaintenanceSummary.likelyTestUsers.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/20 bg-white/70 p-4 text-sm font-semibold text-[var(--color-mid)]">
                                  No likely test staff accounts detected right now.
                                </div>
                              ) : (
                                staffMaintenanceSummary.likelyTestUsers.slice(0, 5).map((member) => (
                                  <div
                                    key={member.id}
                                    className="rounded-2xl border border-[var(--color-mid)]/14 bg-white/80 p-3"
                                  >
                                    <p className="text-sm font-black text-[var(--color-dark)]">{member.name}</p>
                                    <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">{member.email}</p>
                                    <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">
                                      {member.reasonLabels.join(' · ')}
                                    </p>
                                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                                      {(member.roleLabels.length > 0 ? member.roleLabels.join(' · ') : 'No roles') +
                                        (member.teamNames.length > 0 ? ` · ${member.teamNames.join(' · ')}` : '')}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
                      <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-[var(--color-light)]/45 p-4">
                        <div className="flex items-center gap-2">
                          <UserPlus size={16} className="text-[var(--color-primary)]" />
                          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-dark)]">
                            Invite Staff
                          </p>
                        </div>
                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                          Invite coaches, drivers, scouts, technical staff and observers by email. Existing accounts are updated directly with the selected roles and teams.
                        </p>

                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-mid)]">
                              Full Name
                            </label>
                            <input
                              type="text"
                              value={inviteName}
                              onChange={(event) => setInviteName(event.target.value)}
                              placeholder="Example: Lloyd Mutasa"
                              className="w-full rounded-2xl border border-[var(--color-mid)]/30 bg-white p-3 font-semibold outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-mid)]">
                              Email
                            </label>
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={(event) => setInviteEmail(event.target.value)}
                              placeholder="staff@mwosfc.com"
                              className="w-full rounded-2xl border border-[var(--color-mid)]/30 bg-white p-3 font-semibold outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                            />
                          </div>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">Roles</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {clubAccess?.roles.map((role) => {
                                const active = inviteRoleSlugs.includes(role.slug);
                                return (
                                  <button
                                    key={role.slug}
                                    onClick={() => toggleInviteRole(role.slug)}
                                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                      active
                                        ? 'border-[var(--color-primary)]/25 bg-white shadow-sm'
                                        : 'border-[var(--color-mid)]/16 bg-white/70'
                                    }`}
                                  >
                                    <p className="text-sm font-black text-[var(--color-dark)]">{role.label}</p>
                                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                                      {role.description}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">Teams</p>
                              {inviteNeedsTeam && (
                                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">
                                  Required for coach / driver / scout
                                </span>
                              )}
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {clubAccess?.teams.map((team) => {
                                const active = inviteTeamIds.includes(team.id);
                                return (
                                  <button
                                    key={team.id}
                                    onClick={() => toggleInviteTeam(team.id)}
                                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                      active
                                        ? 'border-[var(--color-accent)]/24 bg-[var(--color-accent)]/7'
                                        : 'border-[var(--color-mid)]/16 bg-white/70'
                                    }`}
                                  >
                                    <p className="text-sm font-black text-[var(--color-dark)]">{team.name}</p>
                                    <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                                      {team.is_active ? 'Active team' : 'Prepared for activation'}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                            {inviteNeedsTeam && inviteTeamIds.length === 0 && (
                              <p className="mt-2 text-xs font-semibold text-[var(--color-mid)]">
                                Select at least one team when inviting coaches, drivers or scouts.
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-3 border-t border-[var(--color-mid)]/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs font-semibold leading-5 text-[var(--color-mid)]">
                              Choose whether the access is delivered by email or by a manual share link. Existing accounts are updated immediately either way.
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => void handleSendInvite('email')}
                                disabled={inviteLoading}
                                className="rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-opacity-90 disabled:opacity-50"
                              >
                                <span className="inline-flex items-center gap-2">
                                  <Mail size={16} />
                                  {inviteLoading ? 'Working...' : 'Send Email Invite'}
                                </span>
                              </button>
                              <button
                                onClick={() => void handleSendInvite('manual_link')}
                                disabled={inviteLoading}
                                className="rounded-2xl border border-[var(--color-primary)]/18 bg-white px-4 py-2.5 text-sm font-bold text-[var(--color-primary)] shadow-sm disabled:opacity-50"
                              >
                                Create Share Link
                              </button>
                              <button
                                onClick={() => void handleSendInvite('whatsapp_share')}
                                disabled={inviteLoading}
                                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm disabled:opacity-50"
                              >
                                Share on WhatsApp
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-[var(--color-primary)]" />
                          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-dark)]">
                            Pending Invitations
                          </p>
                        </div>
                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                          Track invites waiting for activation, resend them when needed, and keep a short audit trail of recent access updates.
                        </p>

                        <div className="mt-4 space-y-3">
                          {staffOperationsMetrics.stalePendingInvitationCount > 0 && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-black text-amber-900">
                                    {staffOperationsMetrics.stalePendingInvitationCount} stale invite
                                    {staffOperationsMetrics.stalePendingInvitationCount === 1 ? '' : 's'} need follow-up
                                  </p>
                                  <p className="mt-2 text-sm font-semibold leading-6 text-amber-800">
                                    These invites are already past their activation window. You can leave them for audit history, or move them out of the pending queue in one safe cleanup action.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void handleExpireStaleInvites()}
                                  disabled={invitationActionKey === 'expire-stale'}
                                  className="rounded-2xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-800 shadow-sm disabled:opacity-50"
                                >
                                  {invitationActionKey === 'expire-stale' ? 'Cleaning…' : 'Expire stale invites'}
                                </button>
                              </div>
                            </div>
                          )}

                          {filteredPendingInvitations.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/20 bg-[var(--color-light)]/45 p-4 text-sm font-semibold text-[var(--color-mid)]">
                              No pending invitations match the current filters.
                            </div>
                          ) : (
                            filteredPendingInvitations.map((invitation) => (
                              <div
                                key={invitation.id}
                                className="rounded-2xl border border-[var(--color-mid)]/16 bg-[var(--color-light)]/35 p-4"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="text-sm font-black text-[var(--color-dark)]">{invitation.fullName}</p>
                                    <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">{invitation.email}</p>
                                    {likelyTestInvitationIds.has(invitation.id) ? (
                                      <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">
                                        Likely QA data
                                      </span>
                                    ) : null}
                                  </div>
                                  <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                                    {invitation.statusLabel}
                                  </span>
                                </div>

                                <div className="mt-3 space-y-2 text-xs font-semibold text-[var(--color-mid)]">
                                  <p>
                                    Roles:{' '}
                                    <span className="font-black text-[var(--color-dark)]">
                                      {invitation.roles.map((role) => role.label).join(' · ')}
                                    </span>
                                  </p>
                                  <p>
                                    Teams:{' '}
                                    <span className="font-black text-[var(--color-dark)]">
                                      {invitation.teams.length > 0
                                        ? invitation.teams.map((team) => team.name).join(' · ')
                                        : 'No team required'}
                                    </span>
                                  </p>
                                  <p>
                                    Invited by{' '}
                                    <span className="font-black text-[var(--color-dark)]">{invitation.inviterName}</span>{' '}
                                    on {dateTimeFormatter.format(new Date(invitation.createdAt))}
                                  </p>
                                  <p>
                                    Expires on{' '}
                                    <span className="font-black text-[var(--color-dark)]">
                                      {dateTimeFormatter.format(new Date(invitation.expiresAt))}
                                    </span>
                                  </p>
                                  {invitation.lastSentAt && (
                                    <p>
                                      Last sent:{' '}
                                      <span className="font-black text-[var(--color-dark)]">
                                        {dateTimeFormatter.format(new Date(invitation.lastSentAt))}
                                      </span>
                                    </p>
                                  )}
                                </div>

                                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                  <button
                                    onClick={() => void handleShareInviteOnWhatsApp(invitation.id)}
                                    disabled={invitationActionKey === `share:${invitation.id}`}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 disabled:opacity-50"
                                  >
                                    <Mail size={16} />
                                    {invitationActionKey === `share:${invitation.id}` ? 'Working...' : 'Share on WhatsApp'}
                                  </button>
                                  <button
                                    onClick={() => void handleResendInvite(invitation.id)}
                                    disabled={invitationActionKey === `resend:${invitation.id}`}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-primary)]/18 bg-white px-4 py-2.5 text-sm font-bold text-[var(--color-primary)] shadow-sm disabled:opacity-50"
                                  >
                                    <RotateCcw size={16} />
                                    {invitationActionKey === `resend:${invitation.id}` ? 'Working...' : 'Resend Invite'}
                                  </button>
                                  <button
                                    onClick={() => void handleCopyInviteLink(invitation.id)}
                                    disabled={invitationActionKey === `copy:${invitation.id}`}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-2.5 text-sm font-bold text-[var(--color-dark)] shadow-sm disabled:opacity-50"
                                  >
                                    <Mail size={16} />
                                    {invitationActionKey === `copy:${invitation.id}` ? 'Preparing...' : 'Copy Activation Link'}
                                  </button>
                                  <button
                                    onClick={() => void handleCancelInvite(invitation.id)}
                                    disabled={invitationActionKey === `cancel:${invitation.id}`}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"
                                  >
                                    <XCircle size={16} />
                                    {invitationActionKey === `cancel:${invitation.id}` ? 'Working...' : 'Cancel Invite'}
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="mt-5 border-t border-[var(--color-mid)]/16 pt-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                            Recent Invitation Activity
                          </p>
                          <div className="mt-3 space-y-3">
                            {filteredInvitationHistory.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/20 bg-[var(--color-light)]/45 p-4 text-sm font-semibold text-[var(--color-mid)]">
                                No invitation history matches the current filters.
                              </div>
                            ) : (
                              filteredInvitationHistory.slice(0, 5).map((invitation) => (
                                <div
                                  key={invitation.id}
                                  className="rounded-2xl border border-[var(--color-mid)]/14 bg-[var(--color-light)]/35 p-3"
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="text-sm font-black text-[var(--color-dark)]">{invitation.fullName}</p>
                                      <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">{invitation.email}</p>
                                    </div>
                                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-dark)] shadow-sm">
                                      {invitation.statusLabel}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                                    {invitation.roles.map((role) => role.label).join(' · ')}
                                    {invitation.teams.length > 0 ? ` · ${invitation.teams.map((team) => team.name).join(' · ')}` : ''}
                                  </p>
                                  <p className="mt-1 text-[11px] font-semibold text-[var(--color-mid)]">
                                    Updated {dateTimeFormatter.format(new Date(invitation.updatedAt))}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[0.92fr,1.08fr]">
                      <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-[var(--color-light)]/45 p-4">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-[var(--color-primary)]" />
                          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-dark)]">
                            Staff Accounts ({filteredStaffUsers.length})
                          </p>
                        </div>
                        <div className="mt-4 space-y-2">
                          {filteredStaffUsers.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/20 bg-white/70 p-4 text-sm font-semibold text-[var(--color-mid)]">
                              No staff accounts match the current filters.
                            </div>
                          ) : (
                            filteredStaffUsers.map((member) => {
                            const active = member.id === selectedUserId;
                            return (
                              <button
                                key={member.id}
                                onClick={() => setSelectedUserId(member.id)}
                                className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                                  active
                                    ? 'border-[var(--color-primary)]/25 bg-white shadow-sm'
                                    : 'border-transparent bg-white/65 hover:border-[var(--color-primary)]/15'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm font-black text-[var(--color-dark)]">{member.name}</p>
                                  {likelyTestUserIds.has(member.id) ? (
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">
                                      Likely QA data
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">{member.email}</p>
                                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                                  {member.roles.length > 0
                                    ? member.roles.map((role) => role.label).join(' · ')
                                    : 'Pending access'}
                                </p>
                              </button>
                            );
                            })
                          )}
                        </div>
                        {selectedUserOutsideFilters ? (
                          <p className="mt-3 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                            The currently selected staff member is outside the active filters. Their access editor stays open on the right so we do not interrupt your work.
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
                        {selectedUser ? (
                          <>
                            <p className="text-lg font-black text-[var(--color-dark)]">{selectedUser.name}</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">{selectedUser.email}</p>
                            <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                              Legacy profile role: {selectedUser.legacyRole}
                            </p>
                            {likelyTestUserIds.has(selectedUser.id) ? (
                              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">
                                  Likely QA / smoke account
                                </p>
                                <p className="mt-2 text-sm font-semibold leading-6 text-amber-800">
                                  This account looks like test data based on its name or email alias. Keep it out of live rollout unless the club explicitly wants to keep it.
                                </p>
                              </div>
                            ) : null}

                            <div className="mt-5">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                                Roles
                              </p>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {clubAccess?.roles.map((role) => {
                                  const active = selectedRoleSlugs.includes(role.slug);
                                  return (
                                    <button
                                      key={role.slug}
                                      onClick={() => toggleRole(role.slug)}
                                      className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                        active
                                          ? 'border-[var(--color-primary)]/25 bg-[var(--color-primary)]/6'
                                          : 'border-[var(--color-mid)]/18 bg-[var(--color-light)]/45'
                                      }`}
                                    >
                                      <p className="text-sm font-black text-[var(--color-dark)]">{role.label}</p>
                                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                                        {role.description}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-5">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                                Teams
                              </p>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {clubAccess?.teams.map((team) => {
                                  const active = selectedTeamIds.includes(team.id);
                                  return (
                                    <button
                                      key={team.id}
                                      onClick={() => toggleTeam(team.id)}
                                      className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                        active
                                          ? 'border-[var(--color-accent)]/22 bg-[var(--color-accent)]/6'
                                          : 'border-[var(--color-mid)]/18 bg-[var(--color-light)]/45'
                                      }`}
                                    >
                                      <p className="text-sm font-black text-[var(--color-dark)]">{team.name}</p>
                                      <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                                        {team.is_active ? 'Active team' : 'Prepared for activation'}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-5 flex flex-col gap-3 border-t border-[var(--color-mid)]/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                {accessSuccess && (
                                  <span className="flex items-center text-sm font-bold text-green-600">
                                    <CheckCircle size={16} className="mr-1" /> {clubAccessActionLabels.successLabel}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                  onClick={() => void handleClearAccess()}
                                  disabled={accessLoading || clubAccessActionLabels.isClearing}
                                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <XCircle size={16} />
                                    {clubAccessActionLabels.clearLabel}
                                  </span>
                                </button>
                                <button
                                  onClick={() => void handleSaveAccess()}
                                  disabled={accessLoading}
                                  className="rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-opacity-90 disabled:opacity-50"
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <Save size={16} />
                                    {accessLoading ? 'Saving...' : clubAccessActionLabels.saveLabel}
                                  </span>
                                </button>
                              </div>
                            </div>
                            <p className="mt-3 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                              Clearing access keeps the staff account in Authentication, but removes all club roles and team assignments until an admin restores them.
                            </p>
                          </>
                        ) : (
                          <div className="rounded-2xl border border-[var(--color-mid)]/16 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                            {accessLoading ? 'Loading club access…' : 'Select a user to manage club access.'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-[var(--color-primary)]" />
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-dark)]">
                          Recent Access Activity
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                        Keep a short audit trail of who changed staff access, invited people, or revoked roles.
                      </p>

                      <div className="mt-4 space-y-3">
                        {filteredStaffAccessEvents.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/20 bg-[var(--color-light)]/45 p-4 text-sm font-semibold text-[var(--color-mid)]">
                            No access activity matches the current filters.
                          </div>
                        ) : (
                          filteredStaffAccessEvents.slice(0, 8).map((event) => (
                            <div
                              key={event.id}
                              className="rounded-2xl border border-[var(--color-mid)]/14 bg-[var(--color-light)]/35 p-4"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm font-black text-[var(--color-dark)]">{event.targetName}</p>
                                  <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">{event.targetEmail}</p>
                                </div>
                                <span
                                  className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] shadow-sm ${
                                    event.tone === 'warning'
                                      ? 'bg-amber-100 text-amber-800'
                                      : event.tone === 'success'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-white text-[var(--color-dark)]'
                                  }`}
                                >
                                  {event.title}
                                </span>
                              </div>

                              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-dark)]">{event.detail}</p>
                              <p className="mt-2 text-[11px] font-semibold text-[var(--color-mid)]">
                                By {event.actorName} · {dateTimeFormatter.format(new Date(event.createdAt))}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-mid)]/16 bg-white/96 px-4 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-12px_28px_rgba(15,23,42,0.1)] backdrop-blur-xl md:hidden">
        {isAdmin ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-primary)]/18 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-[var(--color-primary)] shadow-sm disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? 'Saving…' : 'Save Settings'}
            </button>
            <button
              onClick={() => void handleSaveAccess()}
              disabled={accessLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-md disabled:opacity-50"
            >
              <Save size={16} />
              {accessLoading ? 'Saving…' : clubAccessActionLabels.saveLabel}
            </button>
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-md disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? 'Saving…' : 'Save Settings'}
          </button>
        )}
      </div>
    </div>
  );
}
