import { describe, expect, it } from 'vitest';
import {
  buildClubPlayerSavePayload,
  createEmptyClubPlayerDraft,
  toClubPlayerDraft,
} from './clubPlayersDomain';

describe('buildClubPlayerSavePayload', () => {
  it('normalizes a manual roster draft and computes BMI from height and weight', () => {
    const draft = {
      ...createEmptyClubPlayerDraft(),
      squadNumber: ' 17 ',
      firstName: '  Aristotle ',
      lastName: ' Manyamba ',
      displayName: '',
      weightKg: '75',
      heightCm: '180',
      bmi: '',
      dominantFoot: 'right' as const,
      nationality: ' Zimbabwe ',
      primaryPosition: ' Forward ',
      secondaryPosition: ' Right Wing ',
      notes: ' Needs minutes ',
      isActive: true,
    };

    const result = buildClubPlayerSavePayload('team-1', draft);

    expect(result.errors).toEqual([]);
    expect(result.payload).toEqual({
      team_id: 'team-1',
      source_label: 'manual_roster_editor',
      source_row_number: null,
      squad_number: 17,
      first_name: 'Aristotle',
      last_name: 'Manyamba',
      display_name: 'Aristotle Manyamba',
      weight_kg: 75,
      height_cm: 180,
      bmi: 23.15,
      dominant_foot: 'right',
      nationality: 'Zimbabwe',
      primary_position: 'Forward',
      secondary_position: 'Right Wing',
      notes: 'Needs minutes',
      is_active: true,
    });
  });

  it('keeps an explicit display name and explicit BMI when supplied', () => {
    const draft = {
      ...createEmptyClubPlayerDraft(),
      firstName: 'Blessing',
      lastName: 'Moyo',
      displayName: 'B. Moyo',
      heightCm: '170',
      weightKg: '65',
      bmi: '22.49',
      dominantFoot: 'both' as const,
    };

    const result = buildClubPlayerSavePayload('team-1', draft);

    expect(result.errors).toEqual([]);
    expect(result.payload?.display_name).toBe('B. Moyo');
    expect(result.payload?.bmi).toBe(22.49);
    expect(result.payload?.dominant_foot).toBe('both');
  });

  it('returns field errors for missing identity, missing team and invalid numeric fields', () => {
    const draft = {
      ...createEmptyClubPlayerDraft(),
      squadNumber: 'abc',
      heightCm: '-180',
      weightKg: 'heavy',
      bmi: '0',
    };

    const result = buildClubPlayerSavePayload('', draft);

    expect(result.payload).toBeNull();
    expect(result.errors).toEqual([
      'Choose a team before saving the player.',
      'Add at least a first name, last name or display name.',
      'Squad number must be a valid number.',
      'Height must be greater than 0.',
      'Weight must be a valid number.',
      'BMI must be greater than 0.',
    ]);
  });
});

describe('toClubPlayerDraft', () => {
  it('maps a roster player into editable string fields', () => {
    const draft = toClubPlayerDraft({
      squadNumber: 10,
      firstName: 'Tadiwa',
      lastName: 'Zhou',
      displayName: 'Tadiwa Zhou',
      weightKg: 71.5,
      heightCm: 178,
      bmi: 22.57,
      dominantFoot: 'left',
      nationality: 'Zimbabwe',
      primaryPosition: 'Midfielder',
      secondaryPosition: '',
      notes: 'Captain group',
      isActive: false,
    });

    expect(draft).toEqual({
      squadNumber: '10',
      firstName: 'Tadiwa',
      lastName: 'Zhou',
      displayName: 'Tadiwa Zhou',
      weightKg: '71.5',
      heightCm: '178',
      bmi: '22.57',
      dominantFoot: 'left',
      nationality: 'Zimbabwe',
      primaryPosition: 'Midfielder',
      secondaryPosition: '',
      notes: 'Captain group',
      isActive: false,
    });
  });
});
