import { AlertCircle, Ban, CheckCircle2, Loader2, Save, Send, Truck } from 'lucide-react';
import type { AppTeam } from '../../lib/data';
import type { TransportDriverOption, TransportWorkspace } from '../../lib/transportData';

type SaveAction = 'draft' | 'publish' | 'complete' | 'cancel';

export default function TransportPlanEditor({
  workspace,
  teams,
  drivers,
  savingState,
  onChange,
  onAction,
}: {
  workspace: TransportWorkspace;
  teams: AppTeam[];
  drivers: TransportDriverOption[];
  savingState: SaveAction | null;
  onChange: <K extends keyof TransportWorkspace>(field: K, value: TransportWorkspace[K]) => void;
  onAction: (action: SaveAction) => void;
}) {
  const isPublished = ['published', 'updated', 'completed'].includes(workspace.status);

  return (
    <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
            Trip editor
          </p>
          <h2 className="mt-1 text-xl font-black text-[var(--color-dark)]">
            {workspace.id ? workspace.title || 'Transport plan' : 'New transport plan'}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
            Plan the departure, assign the driver and keep every important change attached to one transport record.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--color-light)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-dark)]">
            {workspace.status}
          </span>
          {workspace.driverName ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)]/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]">
              <Truck size={13} />
              {workspace.driverName}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Team</span>
          <select
            value={workspace.team.id}
            onChange={(event) => onChange('team', teams.find((team) => team.id === event.target.value) || workspace.team)}
            disabled={!workspace.canCreate || Boolean(workspace.id)}
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Context</span>
          <select
            value={workspace.contextType}
            onChange={(event) => onChange('contextType', event.target.value as TransportWorkspace['contextType'])}
            disabled={!workspace.canManage}
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          >
            <option value="match">Match</option>
            <option value="training">Training</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Title</span>
          <input
            value={workspace.title}
            onChange={(event) => onChange('title', event.target.value)}
            disabled={!workspace.canManage}
            placeholder="Example: U19 away transport to Harare"
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Event date</span>
          <input
            type="date"
            value={workspace.eventDate}
            onChange={(event) => onChange('eventDate', event.target.value)}
            disabled={!workspace.canManage}
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Departure time</span>
          <input
            type="time"
            value={workspace.departureTime}
            onChange={(event) => onChange('departureTime', event.target.value)}
            disabled={!workspace.canManage}
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Arrival target</span>
          <input
            type="time"
            value={workspace.arrivalTargetTime}
            onChange={(event) => onChange('arrivalTargetTime', event.target.value)}
            disabled={!workspace.canManage}
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Meeting point</span>
          <input
            value={workspace.meetingPoint}
            onChange={(event) => onChange('meetingPoint', event.target.value)}
            disabled={!workspace.canManage}
            placeholder="Main gate, academy, hotel..."
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Destination</span>
          <input
            value={workspace.destination}
            onChange={(event) => onChange('destination', event.target.value)}
            disabled={!workspace.canManage}
            placeholder="Venue, city or pickup destination..."
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Assigned driver</span>
          <select
            value={workspace.driverUserId}
            onChange={(event) => onChange('driverUserId', event.target.value)}
            disabled={!workspace.canManage || !workspace.canAssignDriver}
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          >
            <option value="">Select driver</option>
            {drivers.map((driver) => (
              <option key={driver.userId} value={driver.userId}>
                {driver.name}{driver.teamNames.length ? ` · ${driver.teamNames.join(', ')}` : ''}
              </option>
            ))}
          </select>
        </label>

        {!workspace.canAssignDriver && workspace.canManage ? (
          <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            Assigned drivers can update trip details and complete the trip, but only admin or technical staff can reassign the driver.
          </div>
        ) : null}

        <label className="space-y-2 md:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Contact notes</span>
          <textarea
            value={workspace.contactNotes}
            onChange={(event) => onChange('contactNotes', event.target.value)}
            disabled={!workspace.canManage}
            rows={3}
            placeholder="Useful phone numbers, who to call, or urgent coordination notes..."
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Travel notes</span>
          <textarea
            value={workspace.notes}
            onChange={(event) => onChange('notes', event.target.value)}
            disabled={!workspace.canManage}
            rows={4}
            placeholder="Luggage notes, route context, player timing, checkpoints..."
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          />
        </label>
      </div>

      {workspace.id && isPublished ? (
        <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-[var(--color-primary)]/14 bg-[var(--color-primary)]/5 px-4 py-3 text-sm font-semibold text-[var(--color-dark)]">
          <AlertCircle size={16} className="text-[var(--color-primary)]" />
          Important changes to departure time, arrival target, destination or driver will trigger in-app and email alerts.
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {workspace.canManage ? (
          <button
            type="button"
            onClick={() => onAction('draft')}
            disabled={savingState !== null}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-light)] px-4 py-3 text-sm font-black text-[var(--color-dark)] disabled:opacity-50"
          >
            {savingState === 'draft' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save draft
          </button>
        ) : null}

        {workspace.canCreate ? (
          <button
            type="button"
            onClick={() => onAction('publish')}
            disabled={savingState !== null}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {savingState === 'publish' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {workspace.status === 'draft' ? 'Publish plan' : 'Save update'}
          </button>
        ) : null}

        {workspace.canManage && workspace.id ? (
          <button
            type="button"
            onClick={() => onAction('complete')}
            disabled={savingState !== null || workspace.status === 'completed'}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {savingState === 'complete' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Mark completed
          </button>
        ) : null}

        {workspace.canCreate && workspace.id ? (
          <button
            type="button"
            onClick={() => onAction('cancel')}
            disabled={savingState !== null || workspace.status === 'cancelled'}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {savingState === 'cancel' ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
            Cancel plan
          </button>
        ) : null}
      </div>
    </article>
  );
}
