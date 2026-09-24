import { describe, expect, it } from 'vitest';
import { applyTipsOcrFields, parseTipsOcrText } from './tipsOcrDomain';
import { createEmptyTipsEvaluation } from './tipsEvaluationDomain';

describe('reviewed TIPS OCR proposals', () => {
  it('recognizes only labeled 1-10 TIPS scores and keeps the existing scale separate', () => {
    const result = parseTipsOcrText(`TIPS Methodology\nPosition(s): QA midfield\nPreferred foot: Left\nFirst touch: 8/10\nScanning: 7\nAcceleration / pace: 9/10\nAgility: 6/5\nOverall assessment: Recommended`);
    expect(result.recognized).toBe(true);
    expect(result.fields).toMatchObject({ positions: 'QA midfield', preferredFoot: 'Left', first_touch: '8', scanning: '7', acceleration_pace: '9' });
    expect(result.fields.agility).toBeUndefined();
    expect(result.warnings.join(' ')).toContain('Agility');
    const original = createEmptyTipsEvaluation();
    original.attributes.passing.score = 4;
    const next = applyTipsOcrFields(original, result.fields, ['positions', 'first_touch', 'acceleration_pace']);
    expect(next.positions).toBe('QA midfield');
    expect(next.attributes.first_touch.score).toBe(8);
    expect(next.attributes.acceleration_pace.score).toBe(9);
    expect(next.attributes.scanning.score).toBe('');
    expect(next.attributes.passing.score).toBe(4);
    expect(next.overallAssessment).toBe('');
  });

  it('does not label a generic individual scan as TIPS', () => {
    expect(parseTipsOcrText('Player: QA Sample\nPace: 4/5').recognized).toBe(false);
  });

  it('rejects edited out-of-range scores before applying any values', () => {
    expect(() => applyTipsOcrFields(createEmptyTipsEvaluation(), { positions: 'QA', first_touch: '11' }, ['positions', 'first_touch'])).toThrow('1 to 10');
  });

  it('applies reviewed handwritten notes without activating the old 1-5 scale', () => {
    const current = createEmptyTipsEvaluation();
    const next = applyTipsOcrFields(current, { first_touch: '8', first_touch_notes: 'Clean receiving touch' }, ['first_touch', 'first_touch_notes']);
    expect(next.attributes.first_touch).toEqual({ score: 8, notes: 'Clean receiving touch' });
    expect(next.legacyReviewEnabled).toBe(false);
    expect(current.attributes.first_touch).toEqual({ score: '', notes: '' });
  });
});
