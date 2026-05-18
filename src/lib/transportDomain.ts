export type TransportPlanStatus = 'draft' | 'published' | 'updated' | 'completed' | 'cancelled';
export type TransportContextType = 'match' | 'training' | 'other';

export type TransportPlanDraft = {
  title: string;
  contextType: TransportContextType;
  eventDate: string;
  departureTime: string;
  arrivalTargetTime: string;
  meetingPoint: string;
  destination: string;
  driverUserId: string;
  notes: string;
  contactNotes: string;
  status: TransportPlanStatus;
};

export type TransportValidationMode = 'draft' | 'publish';

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const YYYY_MM_DD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function buildTransportDraft(): TransportPlanDraft {
  return {
    title: '',
    contextType: 'match',
    eventDate: '',
    departureTime: '',
    arrivalTargetTime: '',
    meetingPoint: '',
    destination: '',
    driverUserId: '',
    notes: '',
    contactNotes: '',
    status: 'draft',
  };
}

export function normalizeTransportTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (HH_MM_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (/[^0-9:\s]/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    const normalized = trimmed.slice(0, 5);
    return HH_MM_PATTERN.test(normalized) ? normalized : trimmed;
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) {
    return trimmed;
  }

  if (digitsOnly.length === 3) {
    const normalized = `0${digitsOnly[0]}:${digitsOnly.slice(1)}`;
    return HH_MM_PATTERN.test(normalized) ? normalized : trimmed;
  }

  if (digitsOnly.length === 4) {
    const normalized = `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2)}`;
    return HH_MM_PATTERN.test(normalized) ? normalized : trimmed;
  }

  const colonParts = trimmed.split(':').map((part) => part.trim());
  if (colonParts.length === 2 && colonParts.every((part) => /^\d{1,2}$/.test(part))) {
    const normalized = `${colonParts[0].padStart(2, '0')}:${colonParts[1].padStart(2, '0')}`;
    return HH_MM_PATTERN.test(normalized) ? normalized : trimmed;
  }

  return trimmed;
}

export function normalizeTransportDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (YYYY_MM_DD_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (/[^0-9\-\/\s]/.test(trimmed)) {
    return trimmed;
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 8) {
    const normalized = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6)}`;
    return isValidTransportDate(normalized) ? normalized : trimmed;
  }

  const parts = trimmed.split(/[-/\s]+/).filter(Boolean);
  if (parts.length === 3 && /^\d{4}$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1]) && /^\d{1,2}$/.test(parts[2])) {
    const normalized = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    return isValidTransportDate(normalized) ? normalized : trimmed;
  }

  return trimmed;
}

function isValidTransportTime(value: string) {
  return !value || HH_MM_PATTERN.test(value);
}

function isValidTransportDate(value: string) {
  if (!value) return true;
  const match = value.match(YYYY_MM_DD_PATTERN);
  if (!match) return false;

  const [, yearPart, monthPart, dayPart] = match;
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    Number.isFinite(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function normalizeTransportPlan(plan: TransportPlanDraft): TransportPlanDraft {
  return {
    ...plan,
    title: plan.title.trim(),
    eventDate: normalizeTransportDate(plan.eventDate),
    departureTime: normalizeTransportTime(plan.departureTime),
    arrivalTargetTime: normalizeTransportTime(plan.arrivalTargetTime),
    meetingPoint: plan.meetingPoint.trim(),
    destination: plan.destination.trim(),
    driverUserId: plan.driverUserId.trim(),
    notes: plan.notes.trim(),
    contactNotes: plan.contactNotes.trim(),
  };
}

export function validateTransportPlan(
  plan: TransportPlanDraft,
  mode: TransportValidationMode = 'publish',
): string[] {
  const normalized = normalizeTransportPlan(plan);
  const errors: string[] = [];

  if (mode === 'draft') {
    if (!normalized.title && !normalized.destination && !normalized.eventDate) {
      errors.push('Add at least a title, destination, or event date before saving a draft.');
    }
    return errors;
  }

  if (!normalized.title) errors.push('Title is required.');
  if (!normalized.eventDate) errors.push('Event date is required.');
  if (normalized.eventDate && !isValidTransportDate(normalized.eventDate)) {
    errors.push('Event date must be in YYYY-MM-DD format.');
  }
  if (!normalized.departureTime) errors.push('Departure time is required.');
  if (normalized.departureTime && !isValidTransportTime(normalized.departureTime)) {
    errors.push('Departure time must be in HH:MM format.');
  }
  if (normalized.arrivalTargetTime && !isValidTransportTime(normalized.arrivalTargetTime)) {
    errors.push('Arrival target must be in HH:MM format.');
  }
  if (!normalized.meetingPoint) errors.push('Meeting point is required.');
  if (!normalized.destination) errors.push('Destination is required.');
  if (!normalized.driverUserId) errors.push('Assigned driver is required.');

  return errors;
}

function toDepartureDateTime(plan: TransportPlanDraft) {
  const date = plan.eventDate || '1970-01-01';
  const time = plan.departureTime || '00:00';
  return new Date(`${date}T${time}:00.000Z`);
}

export function detectMajorTransportChange(
  previous: TransportPlanDraft,
  next: TransportPlanDraft,
  now = new Date(),
): Array<'eventDate' | 'departureTime' | 'arrivalTargetTime' | 'destination' | 'driverUserId'> {
  const previousStatus = previous.status;
  if (!['published', 'updated'].includes(previousStatus)) {
    return [];
  }

  if (toDepartureDateTime(next) <= now) {
    return [];
  }

  const changed: Array<'eventDate' | 'departureTime' | 'arrivalTargetTime' | 'destination' | 'driverUserId'> = [];

  if (previous.eventDate !== next.eventDate) changed.push('eventDate');
  if (previous.departureTime !== next.departureTime) changed.push('departureTime');
  if (previous.arrivalTargetTime !== next.arrivalTargetTime) changed.push('arrivalTargetTime');
  if (previous.destination.trim() !== next.destination.trim()) changed.push('destination');
  if (previous.driverUserId !== next.driverUserId) changed.push('driverUserId');

  return changed;
}
