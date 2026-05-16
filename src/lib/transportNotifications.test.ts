import { describe, expect, it } from 'vitest';

import {
  buildTransportNotificationDraft,
  type TransportNotificationRecipient,
} from './transportNotifications';

const recipient: TransportNotificationRecipient = {
  userId: 'driver-1',
  email: 'driver@example.com',
  name: 'Driver One',
};

describe('buildTransportNotificationDraft', () => {
  it('creates an email-enabled transport notification draft', () => {
    const draft = buildTransportNotificationDraft({
      recipient,
      actorName: 'Transport Admin',
      teamName: 'First Team',
      transportPlanId: 'transport-1',
      linkPath: '/transport?team=first-team',
      detail: 'Departure moved to 08:00 from the club gate.',
    });

    expect(draft.type).toBe('transport_plan_updated');
    expect(draft.emailEnabled).toBe(true);
    expect(draft.title).toContain('First Team');
    expect(draft.message).toContain('Departure moved');
  });
});
