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

export function normalizeTransportPlan(plan: TransportPlanDraft): TransportPlanDraft {
  return {
    ...plan,
    title: plan.title.trim(),
    eventDate: plan.eventDate.trim(),
    departureTime: plan.departureTime.trim(),
    arrivalTargetTime: plan.arrivalTargetTime.trim(),
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
  if (!normalized.departureTime) errors.push('Departure time is required.');
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
