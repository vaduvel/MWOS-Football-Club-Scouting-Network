import { describe, expect, it } from 'vitest';

import {
  buildImportedTrainingDraft,
  classifyImportedTrainingDay,
  inferTrainingImportKind,
} from './trainingImportDomain';

describe('inferTrainingImportKind', () => {
  it('treats image mime types as image imports and PDFs as pdf imports', () => {
    expect(inferTrainingImportKind('application/pdf')).toBe('pdf_import');
    expect(inferTrainingImportKind('image/jpeg')).toBe('image_import');
    expect(inferTrainingImportKind('image/png')).toBe('image_import');
  });
});

describe('classifyImportedTrainingDay', () => {
  it('marks a day ready when time, location, and usable content exist', () => {
    expect(
      classifyImportedTrainingDay({
        weekday: 'Thursday',
        date: '2026-05-14',
        startTime: '12:00',
        endTime: '',
        location: 'Ngoni Stadium',
        objectives: 'Recovery training',
        exercises: '',
        notes: 'Ice bath after session',
      }),
    ).toBe('ready');
  });

  it('marks a day needs_review when partial data exists', () => {
    expect(
      classifyImportedTrainingDay({
        weekday: 'Thursday',
        date: '2026-05-14',
        startTime: '',
        endTime: '',
        location: 'Ngoni Stadium',
        objectives: '',
        exercises: 'Training starts 12:00 hrs',
        notes: '',
      }),
    ).toBe('needs_review');
  });

  it('marks a day missing_info when the extracted block is nearly empty', () => {
    expect(
      classifyImportedTrainingDay({
        weekday: 'Thursday',
        date: '2026-05-14',
        startTime: '',
        endTime: '',
        location: '',
        objectives: '',
        exercises: '',
        notes: '',
      }),
    ).toBe('missing_info');
  });
});

describe('buildImportedTrainingDraft', () => {
  it('converts OCR text into a week draft and retains the raw extracted text', () => {
    const draft = buildImportedTrainingDraft({
      fileName: 'queens-training.jpg',
      mimeType: 'image/jpeg',
      extractedText: `Mwos Queens Training program
Thursday 14/05/26
Venue Ngoni Stadium
Departure Total Samora 1000hrs
Training starts 1200hrs
Recovery Training & Icebath
Bring own water bottle`,
      weekStart: '2026-05-11',
    });

    expect(draft.source.fileName).toBe('queens-training.jpg');
    expect(draft.source.rawText).toContain('Mwos Queens Training program');
    expect(draft.days).toHaveLength(7);

    const thursday = draft.days.find((day) => day.weekday === 'Thursday');
    expect(thursday).toMatchObject({
      date: '2026-05-14',
      startTime: '12:00',
      location: 'Ngoni Stadium',
      reviewState: 'ready',
    });
    expect(thursday?.notes).toContain('Departure Total Samora 1000hrs');
  });

  it('keeps unmatched days in missing-info state for later manual correction', () => {
    const draft = buildImportedTrainingDraft({
      fileName: 'u19-programme.pdf',
      mimeType: 'application/pdf',
      extractedText: `Training Mwos U19
Thursday 14-05-2026
Venue: Old Hararians Sports Club
Departure Ngoni Stadium 07:30 a.m.
Total Samora 08:30 a.m
Training starts @ 9.00am`,
      weekStart: '2026-05-11',
    });

    const monday = draft.days.find((day) => day.weekday === 'Monday');
    expect(monday?.reviewState).toBe('missing_info');

    const thursday = draft.days.find((day) => day.weekday === 'Thursday');
    expect(thursday?.notes).toContain('Departure Ngoni Stadium 07:30 a.m.');
  });

  it('ignores invalid date-like load tokens before parsing a real session date', () => {
    const draft = buildImportedTrainingDraft({
      fileName: 'pre-season-planner.pdf',
      mimeType: 'application/pdf',
      extractedText: `FREE DAY 60-80-50 LOAD MATCH
Thursday 14-05-2026
Venue: Ngoni Stadium
Training starts 1200hrs
Recovery Training & Icebath`,
      weekStart: '2026-05-11',
    });

    const thursday = draft.days.find((day) => day.weekday === 'Thursday');
    expect(thursday).toMatchObject({
      date: '2026-05-14',
      startTime: '12:00',
      location: 'Ngoni Stadium',
      reviewState: 'ready',
    });
  });

  it('keeps the programme headline and training start from a WhatsApp-style daily message', () => {
    const draft = buildImportedTrainingDraft({
      fileName: 'whatsapp-training.jpg',
      mimeType: 'image/jpeg',
      extractedText: `Psl training program Thursday
Departure Total Samora 06:30hrs
Arrival Ngoni 07:30hrs
Training starts 08:00hrs
Ngoni stadium`,
      weekStart: '2026-05-18',
    });

    const thursday = draft.days.find((day) => day.weekday === 'Thursday');
    expect(thursday).toMatchObject({
      date: '2026-05-21',
      sessionTitle: 'Psl training program',
      startTime: '08:00',
      location: 'Ngoni stadium',
      reviewState: 'ready',
    });
    expect(thursday?.notes).toContain('Departure Total Samora 06:30hrs');
  });
});
