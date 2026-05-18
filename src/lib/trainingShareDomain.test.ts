import { describe, expect, it } from 'vitest';

import { buildTrainingWhatsAppMessage, buildTrainingWhatsAppShareUrl } from './trainingShareDomain';

describe('buildTrainingWhatsAppMessage', () => {
  it('formats a single-day operational message from structured training data', () => {
    const text = buildTrainingWhatsAppMessage({
      mode: 'single_day',
      teamName: 'MWOS U19',
      weekLabel: 'Week of 11 May 2026',
      days: [
        {
          weekday: 'Thursday',
          date: '2026-05-14',
          startTime: '09:00',
          endTime: '',
          location: 'Old Hararians Sports Club',
          notes: 'Bring own water bottle',
        },
      ],
    });

    expect(text).toContain('MWOS U19');
    expect(text).toContain('Thursday 14 May 2026');
    expect(text).toContain('Venue: Old Hararians Sports Club');
    expect(text).toContain('Training starts 09:00');
  });

  it('strips trailing seconds from imported times before generating the WhatsApp message', () => {
    const text = buildTrainingWhatsAppMessage({
      mode: 'single_day',
      teamName: 'MWOS First Team',
      weekLabel: 'Week of 18 May 2026',
      days: [
        {
          weekday: 'Monday',
          date: '2026-05-18',
          startTime: '09:00:00',
          endTime: '10:30:00',
          location: 'Ngoni Stadium',
          notes: 'Bring water bottle',
        },
      ],
    });

    expect(text).toContain('Training starts 09:00');
    expect(text).toContain('Ends 10:30');
    expect(text).not.toContain('09:00:00');
    expect(text).not.toContain('10:30:00');
  });

  it('formats a weekly summary as multiple day blocks', () => {
    const text = buildTrainingWhatsAppMessage({
      mode: 'weekly_summary',
      teamName: 'MWOS Queens',
      weekLabel: 'Week of 11 May 2026',
      days: [
        {
          weekday: 'Thursday',
          date: '2026-05-14',
          startTime: '12:00',
          endTime: '',
          location: 'Ngoni Stadium',
          notes: 'Recovery training & icebath',
        },
        {
          weekday: 'Friday',
          date: '2026-05-15',
          startTime: '10:00',
          endTime: '',
          location: 'Ngoni Stadium',
          notes: '',
        },
      ],
    });

    expect(text).toContain('MWOS Queens');
    expect(text).toContain('Week of 11 May 2026');
    expect(text).toContain('Friday 15 May 2026');
  });
});

describe('buildTrainingWhatsAppShareUrl', () => {
  it('encodes the generated text into a wa.me share link', () => {
    expect(buildTrainingWhatsAppShareUrl('Hello team')).toBe('https://wa.me/?text=Hello%20team');
  });
});
