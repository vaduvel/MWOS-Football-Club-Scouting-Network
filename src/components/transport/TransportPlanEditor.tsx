import { AlertCircle, Ban, CheckCircle2, Loader2, Save, Send, Truck } from 'lucide-react';
import type { AppTeam } from '../../lib/data';
import type { TransportDriverOption, TransportWorkspace } from '../../lib/transportData';
import { isTerminalTransportStatus, normalizeTransportDate, normalizeTransportTime } from '../../lib/transportDomain';

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
  const isPublished = ['published', 'updated'].includes(workspace.status);
  const isTerminal = isTerminalTransportStatus(workspace.status);
  const canEdit = workspace.canManage && !isTerminal;
  const publishBlockedByDriver = !workspace.driverUserId;
  const normalizeTimeField = (field: 'departureTime' | 'arrivalTargetTime') => {
    const normalized = normalizeTransportTime(workspace[field]);
    if (normalized !== workspace[field]) {
      onChange(field, normalized);
    }
  };
  const normalizeDateField = () => {
    const normalized = normalizeTransportDate(workspace.eventDate);
    if (normalized !== workspace.eventDate) {
      onChange('eventDate', normalized);
    }
  };

  return (
    <article className="mwos-mobile-panel mwos-card-tone-transport md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mwos-section-eyebrow text-[var(--color-mid)]">
            Trip editor
          </p>
          <h2 className="mwos-section-title mt-1 text-balance text-lg font-black text-[var(--color-dark)] md:text-xl">
            {workspace.id ? workspace.title || 'Transport plan' : 'New transport plan'}
          </h2>
          <p className="mwos-section-copy mt-2 text-pretty text-[var(--color-mid)]">
            Plan the departure, assign the driver and keep every important change attached to one transport record.
          </p>
        </div>

        <div className="mwos-subcard-badges">
          <span className="mwos-pill mwos-pill-transport">
            {workspace.status}
          </span>
          {workspace.driverName ? (
            <span className="mwos-pill mwos-pill-staff">
              <Truck size={13} />
              {workspace.driverName}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="mwos-form-label mb-0 text-[var(--color-mid)]">Team</span>
          <select
            value={workspace.team.id}
            onChange={(event) => onChange('team', teams.find((team) => team.id === event.target.value) || workspace.team)}
            disabled={!workspace.canCreate || Boolean(workspace.id) || isTerminal}
            className="mwos-select-field mwos-mobile-input"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="mwos-form-label mb-0 text-[var(--color-mid)]">Context</span>
          <select
            value={workspace.contextType}
            onChange={(event) => onChange('contextType', event.target.value as TransportWorkspace['contextType'])}
            disabled={!canEdit}
            className="mwos-select-field mwos-mobile-input"
          >
            <option value="match">Match</option>
            <option value="training">Training</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="mwos-form-label mb-0 text-[var(--color-mid)]">Title</span>
          <input
            value={workspace.title}
            onChange={(event) => onChange('title', event.target.value)}
            disabled={!canEdit}
            placeholder="Example: U19 away transport to Harare"
            className="mwos-mobile-input"
          />
        </label>

        <label className="space-y-2">
          <span className="mwos-form-label mb-0 text-[var(--color-mid)]">Event date</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            name="eventDate"
            aria-label="Event date"
            value={workspace.eventDate}
            onChange={(event) => onChange('eventDate', event.target.value)}
            onBlur={normalizeDateField}
            disabled={!canEdit}
            maxLength={10}
            placeholder="YYYY-MM-DD"
            className="mwos-mobile-input"
          />
        </label>

        <label className="space-y-2">
          <span className="mwos-form-label mb-0 text-[var(--color-mid)]">Departure time</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            name="departureTime"
            aria-label="Departure time"
            value={workspace.departureTime}
            onChange={(event) => onChange('departureTime', event.target.value)}
            onBlur={() => normalizeTimeField('departureTime')}
            disabled={!canEdit}
            maxLength={5}
            placeholder="HH:MM"
            className="mwos-mobile-input"
          />
        </label>

        <label className="space-y-2">
          <span className="mwos-form-label mb-0 text-[var(--color-mid)]">Arrival target</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            name="arrivalTargetTime"
            aria-label="Arrival target"
            value={workspace.arrivalTargetTime}
            onChange={(event) => onChange('arrivalTargetTime', event.target.value)}
            onBlur={() => normalizeTimeField('arrivalTargetTime')}
            disabled={!canEdit}
            maxLength={5}
            placeholder="HH:MM"
            className="mwos-mobile-input"
          />
        </label>

        <label className="space-y-2">
          <span className="mwos-form-label mb-0 text-[var(--color-mid)]">Meeting point</span>
          <input
            value={workspace.meetingPoint}
            onChange={(event) => onChange('meetingPoint', event.target.value)}
            disabled={!canEdit}
            placeholder="Main gate, academy, hotel..."
            className="mwos-mobile-input"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="mwos-form-label mb-0 text-[var(--color-mid)]">Destination</span>
          <input
            value={workspace.destination}
            onChange={(event) => onChange('destination', event.target.value)}
            disabled={!canEdit}
            placeholder="Venue, city or pickup destination..."
            className="mwos-mobile-input"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="mwos-form-label mb-0 text-[var(--color-mid)]">Assigned driver</span>
          {workspace.canAssignDriver ? (
            <select
              value={workspace.driverUserId}
              onChange={(event) => onChange('driverUserId', event.target.value)}
              disabled={!canEdit}
              className="mwos-select-field mwos-mobile-input"
            >
              <option value="">Select driver</option>
              {drivers.map((driver) => (
                <option key={driver.userId} value={driver.userId}>
                  {driver.name}{driver.teamNames.length ? ` · ${driver.teamNames.join(', ')}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="mwos-mobile-input flex items-center">
              {workspace.driverName || 'No driver assigned'}
            </div>
          )}
        </label>

        {!workspace.canAssignDriver && canEdit ? (
          <div className="mwos-card-tone-alert md:col-span-2 rounded-2xl border p-3 text-sm font-semibold text-[var(--color-accent-deep)]">
            {workspace.driverUserId
              ? 'Only admin or technical staff can reassign the driver.'
              : 'Save this as a draft. A Technical Director or admin must assign a driver before the plan can be published.'}
          </div>
        ) : null}

        <label className="space-y-2 md:col-span-2">
          <span className="mwos-form-label mb-0 text-[var(--color-mid)]">Contact notes</span>
          <textarea
            value={workspace.contactNotes}
            onChange={(event) => onChange('contactNotes', event.target.value)}
            disabled={!canEdit}
            rows={3}
            placeholder="Useful phone numbers, who to call, or urgent coordination notes..."
            className="mwos-mobile-textarea"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="mwos-form-label mb-0 text-[var(--color-mid)]">Travel notes</span>
          <textarea
            value={workspace.notes}
            onChange={(event) => onChange('notes', event.target.value)}
            disabled={!canEdit}
            rows={4}
            placeholder="Luggage notes, route context, player timing, checkpoints..."
            className="mwos-mobile-textarea"
          />
        </label>
      </div>

      {workspace.id && isPublished ? (
        <div className="mwos-mobile-note mwos-card-tone-alert mt-5 inline-flex items-center gap-2 border text-[var(--color-dark)]">
          <AlertCircle size={16} className="text-[var(--color-accent)]" />
          Important changes to departure time, arrival target, destination or driver will trigger in-app and email alerts.
        </div>
      ) : null}

      {isTerminal ? (
        <div className="mwos-mobile-note mt-5 border border-[var(--color-mid)]/16 bg-[var(--color-light)] text-[var(--color-mid)]">
          This transport plan is {workspace.status} and locked to protect the final club record.
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
        {canEdit ? (
          <button
            type="button"
            onClick={() => onAction('draft')}
            disabled={savingState !== null}
            className="mwos-btn mwos-btn-secondary w-full xl:w-auto"
          >
            {savingState === 'draft' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {workspace.status === 'draft' ? 'Save draft' : 'Save changes'}
          </button>
        ) : null}

        {workspace.canCreate && !isTerminal ? (
          <button
            type="button"
            onClick={() => onAction('publish')}
            disabled={savingState !== null || publishBlockedByDriver}
            aria-describedby={publishBlockedByDriver ? 'transport-driver-required' : undefined}
            title={publishBlockedByDriver ? 'Assign a driver before publishing.' : undefined}
            className="mwos-btn mwos-btn-primary w-full xl:w-auto"
          >
            {savingState === 'publish' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {workspace.status === 'draft' ? 'Publish plan' : 'Save update'}
          </button>
        ) : null}

        {publishBlockedByDriver && !isTerminal ? (
          <p id="transport-driver-required" className="self-center text-sm font-semibold text-[var(--color-accent-deep)]">
            Driver assignment required before publish.
          </p>
        ) : null}

        {canEdit && workspace.id ? (
          <button
            type="button"
            onClick={() => onAction('complete')}
            disabled={savingState !== null || !['published', 'updated'].includes(workspace.status)}
            className="mwos-btn mwos-btn-success w-full xl:w-auto"
          >
            {savingState === 'complete' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Mark completed
          </button>
        ) : null}

        {workspace.canCreate && workspace.id && !isTerminal ? (
          <button
            type="button"
            onClick={() => onAction('cancel')}
            disabled={savingState !== null}
            className="mwos-btn mwos-btn-danger w-full xl:w-auto"
          >
            {savingState === 'cancel' ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
            Cancel plan
          </button>
        ) : null}
      </div>
    </article>
  );
}
