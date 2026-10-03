import { describe, expect, it } from 'vitest';
import { calculateTipsScoreSummary, createEmptyTipsEvaluation, hasTipsContent, normalizeTipsEvaluation, TIPS_SECTIONS, usesLegacyIndividualReview } from './tipsEvaluationDomain';

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

  it('calculates overall and four TIPS section means from scored attributes only', () => {
    const tips = createEmptyTipsEvaluation();
    for (const section of TIPS_SECTIONS) for (const [key] of section.attributes) tips.attributes[key].score = 9;
    tips.attributes.first_touch.score = 10;
    const summary = calculateTipsScoreSummary(tips);
    expect(summary.ratedCount).toBe(30);
    expect(summary.averageOutOfTen).toBeCloseTo(9.0333, 3);
    expect(summary.sectionScores.technique).toBeCloseTo(9.125, 3);
    expect(summary.sectionScores.intelligence).toBe(9);
    expect(summary.sectionRatedCounts).toEqual({ technique: 8, intelligence: 8, personality: 7, speed: 7 });
  });

  it('does not invent a score or a chart category for unscored TIPS sections', () => {
    const tips = createEmptyTipsEvaluation();
    tips.attributes.first_touch.score = 2;
    const summary = calculateTipsScoreSummary(tips);
    expect(summary.averageOutOfTen).toBe(2);
    expect(summary.sectionRatedCounts).toEqual({ technique: 1, intelligence: 0, personality: 0, speed: 0 });
    expect(calculateTipsScoreSummary(createEmptyTipsEvaluation()).ratedCount).toBe(0);
  });
});
