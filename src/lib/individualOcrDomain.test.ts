import { describe, expect, it } from 'vitest';
import { parseIndividualOcrText } from './individualOcrDomain';

describe('individual handwritten OCR field proposals', () => {
  it('maps labeled player details and 1-5 scores without changing them', () => {
    const result = parseIndividualOcrText(`Player:\nQA Sample Prospect\nClub:\nQA External Academy\nPosition: central midfielder\nDate: 23 September 2026\nVenue: QA Test Ground\nPace: 4/5\nStrength: 2/5\nPotential: Academy\nObservation notes:\nSteady passing.`);
    expect(result.fields).toMatchObject({
      player_name: 'QA Sample Prospect', club: 'QA External Academy', position: 'central midfielder',
      date: '2026-09-23', venue: 'QA Test Ground', pace: '4', strength: '2',
      potential: 'Academy', overview: 'Steady passing.',
    });
    expect(result.warnings).toEqual([]);
  });

  it('rejects ambiguous 1-10 scores rather than converting them to 1-5', () => {
    const result = parseIndividualOcrText('TIPS Methodology\nPlayer: QA TIPS\nPace: 8/10\nStrength: 6/10');
    expect(result.fields.player_name).toBe('QA TIPS');
    expect(result.fields.pace).toBeUndefined();
    expect(result.fields.strength).toBeUndefined();
    expect(result.warnings.join(' ')).toContain('1-10');
  });

  it('does not invent fields from unlabeled text or invalid dates', () => {
    const result = parseIndividualOcrText('Some writing\nDate: 31/02/2026\nPlayer:');
    expect(result.fields).toEqual({});
    expect(result.warnings.join(' ')).toContain('date');
  });
});
