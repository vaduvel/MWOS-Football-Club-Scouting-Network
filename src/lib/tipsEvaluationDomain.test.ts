import { describe, expect, it } from 'vitest';
import { createEmptyTipsEvaluation, hasTipsContent, normalizeTipsEvaluation, TIPS_SECTIONS, usesLegacyIndividualReview } from './tipsEvaluationDomain';

describe('optional TIPS evaluation', () => {
  it('contains every attribute in the supplied 2027 TIPS form', () => {
    const tips = createEmptyTipsEvaluation();
    expect(TIPS_SECTIONS.map(section => section.attributes.length)).toEqual([8, 8, 7, 7]);
    expect(Object.keys(tips.attributes)).toHaveLength(30);
    expect(hasTipsContent(tips)).toBe(false);
    expect(usesLegacyIndividualReview(tips)).toBe(false);
  });

  it('keeps 1-10 scores separate and strips invalid stored values', () => {
    const tips = createEmptyTipsEvaluation();
    tips.attributes.first_touch.score = 8;
    tips.attributes.passing.score = 4;
    tips.overallAssessment = 'keep_monitoring';
    expect(hasTipsContent(tips)).toBe(true);
    const restored = normalizeTipsEvaluation(tips);
    expect(restored?.attributes.first_touch.score).toBe(8);
    expect(restored?.overallAssessment).toBe('keep_monitoring');
    expect(normalizeTipsEvaluation({ ...tips, attributes: { first_touch: { score: 11, notes: 'x' } } })?.attributes.first_touch.score).toBe('');
  });

  it('preserves the earlier review for existing reports without the new opt-in flag', () => {
    const historical = createEmptyTipsEvaluation();
    delete historical.legacyReviewEnabled;
    expect(usesLegacyIndividualReview(normalizeTipsEvaluation(historical))).toBe(true);
    expect(usesLegacyIndividualReview(null)).toBe(true);
  });
});
