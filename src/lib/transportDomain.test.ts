import { describe, expect, it } from 'vitest';

import {
  buildTransportDraft,
  detectMajorTransportChange,
  normalizeTransportPlan,
  validateTransportPlan,
  type TransportPlanDraft,
} from './transportDomain';

describe('buildTransportDraft', () => {
  it('creates an empty draft in transport draft status', () => {
    const draft = buildTransportDraft();

    expect(draft.status).toBe('draft');
    expect(draft.contextType).toBe('match');
    expect(draft.destination).toBe('');
  });
});

describe('normalizeTransportPlan', () => {
  it('trims text fields before persistence', () => {
    const normalized = normalizeTransportPlan({
      title: '  U17 away to Harare City  ',
      contextType: 'match',
      eventDate: ' 2026-05-22 ',
      departureTime: ' 07:30 ',
      arrivalTargetTime: ' 11:00 ',
      meetingPoint: '  Club gate ',
      destination: '  Harare National Sports Stadium ',
      driverUserId: ' driver-1 ',
      notes: '  Bring spare kit bags  ',
      contactNotes: '  Call manager on arrival  ',
      status: 'draft',
    });

    expect(normalized).toMatchObject({
      title: 'U17 away to Harare City',
      eventDate: '2026-05-22',
      departureTime: '07:30',
      arrivalTargetTime: '11:00',
      meetingPoint: 'Club gate',
      destination: 'Harare National Sports Stadium',
      driverUserId: 'driver-1',
      notes: 'Bring spare kit bags',
      contactNotes: 'Call manager on arrival',
    });
  });
});

describe('validateTransportPlan', () => {
  const basePlan: TransportPlanDraft = {
    title: 'U17 away to Harare City',
    contextType: 'match',
    eventDate: '2026-05-22',
    departureTime: '07:30',
    arrivalTargetTime: '11:00',
    meetingPoint: 'Club gate',
    destination: 'Harare National Sports Stadium',
    driverUserId: 'driver-1',
    notes: '',
    contactNotes: '',
    status: 'draft',
  };

  it('requires the core transport fields for publish mode', () => {
    const errors = validateTransportPlan({
      ...basePlan,
      title: '',
      departureTime: '',
      destination: '',
      driverUserId: '',
    });

    expect(errors).toEqual([
      'Title is required.',
      'Departure time is required.',
      'Destination is required.',
      'Assigned driver is required.',
    ]);
  });

  it('allows lightweight draft saves with partial data', () => {
    expect(
      validateTransportPlan(
        {
          ...buildTransportDraft(),
          title: 'Trip shell',
        },
        'draft',
      ),
    ).toEqual([]);
  });
});

describe('detectMajorTransportChange', () => {
  const publishedPlan: TransportPlanDraft = {
    title: 'First Team away trip',
    contextType: 'match',
    eventDate: '2026-05-22',
    departureTime: '07:30',
    arrivalTargetTime: '11:00',
    meetingPoint: 'Club gate',
    destination: 'Barbourfields Stadium',
    driverUserId: 'driver-1',
    notes: '',
    contactNotes: '',
    status: 'published',
  };

  it('flags important future transport changes', () => {
    const nextPlan: TransportPlanDraft = {
      ...publishedPlan,
      departureTime: '08:00',
      destination: 'National Sports Stadium',
      driverUserId: 'driver-2',
    };

    expect(
      detectMajorTransportChange(publishedPlan, nextPlan, new Date('2026-05-20T08:00:00.000Z')),
    ).toEqual(['departureTime', 'destination', 'driverUserId']);
  });

  it('ignores changes to already-finished trips', () => {
    const nextPlan: TransportPlanDraft = {
      ...publishedPlan,
      departureTime: '08:00',
    };

    expect(
      detectMajorTransportChange(publishedPlan, nextPlan, new Date('2026-05-23T08:00:00.000Z')),
    ).toEqual([]);
  });
});
