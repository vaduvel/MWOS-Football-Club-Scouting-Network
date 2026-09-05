import { handler as acceptStaffInviteHandler } from '../netlify/functions/accept-staff-invite.js'
import { handler as adminAiChatHandler } from '../netlify/functions/admin-ai-chat.js'
import { handler as adminAiInsightsHandler } from '../netlify/functions/admin-ai-insights.js'
import { handler as adminAiStatusHandler } from '../netlify/functions/admin-ai-status.js'
import { handler as adminEmailStatusHandler } from '../netlify/functions/admin-email-status.js'
import { handler as adminRuntimeStatusHandler } from '../netlify/functions/admin-app-runtime-status.js'
import { handler as cancelStaffInviteHandler } from '../netlify/functions/cancel-staff-invite.js'
import { handler as clubRosterHandler } from '../netlify/functions/club-roster.js'
import { handler as expireStaffInvitesHandler } from '../netlify/functions/expire-staff-invites.js'
import { handler as footballSearchHandler } from '../netlify/functions/football-search.js'
import { handler as footballSquadHandler } from '../netlify/functions/football-squad.js'
import { handler as inviteStaffHandler } from '../netlify/functions/invite-staff.js'
import { handler as issueStaffInviteLinkHandler } from '../netlify/functions/issue-staff-invite-link.js'
import { handler as notifyEmailHandler } from '../netlify/functions/notify-email.js'
import { handler as ocrReportHandler } from '../netlify/functions/ocr-report.js'
import { handler as resendStaffInviteHandler } from '../netlify/functions/resend-staff-invite.js'
import triggerTrainingReminders from '../netlify/functions/training-reminders.js'
import { serveFetchResponse, serveNetlifyHandler } from './_lib/netlify-adapter.js'

const HANDLERS: Record<string, (event: any, context?: any) => Promise<any>> = {
  'accept-staff-invite': acceptStaffInviteHandler,
  'cancel-staff-invite': cancelStaffInviteHandler,
  'club-roster': clubRosterHandler,
  'expire-staff-invites': expireStaffInvitesHandler,
  'invite-staff': inviteStaffHandler,
  'issue-staff-invite-link': issueStaffInviteLinkHandler,
  'notify-email': notifyEmailHandler,
  'ocr-report': ocrReportHandler,
  'resend-staff-invite': resendStaffInviteHandler,
  'football-search': footballSearchHandler,
  'football-squad': footballSquadHandler,
  'admin/email-status': adminEmailStatusHandler,
  'admin/runtime-status': adminRuntimeStatusHandler,
  'admin-ai/status': adminAiStatusHandler,
  'admin-ai/insights': adminAiInsightsHandler,
  'admin-ai/chat': adminAiChatHandler,
}

function getRouteKey(req: any) {
  const slug = req?.query?.slug
  if (Array.isArray(slug) && slug.length > 0) {
    return slug.join('/').replace(/^\/+|\/+$/g, '')
  }

  if (typeof slug === 'string' && slug.length > 0) {
    return slug.replace(/^\/+|\/+$/g, '')
  }

  return String(req.url || '')
    .replace(/\?.*$/, '')
    .replace(/^\/\.netlify\/functions\//, '')
    .replace(/^\/api\//, '')
    .replace(/^\/+|\/+$/g, '')
}

export default async function route(req: any, res: any) {
  const routeKey = getRouteKey(req)

  if (routeKey === 'training-reminders') {
    return serveFetchResponse(res, () => triggerTrainingReminders({
      method: req.method || 'GET',
      headers: req.headers || {},
    }))
  }

  const handler = HANDLERS[routeKey]
  if (!handler) {
    return res.status(404).json({ error: 'API route not found.', routeKey })
  }

  return serveNetlifyHandler(req, res, handler)
}
