import { describe, expect, it } from 'vitest';
import { createIndividualReport } from './individualReportDomain';
import { createEmptyTipsEvaluation } from './tipsEvaluationDomain';
import { buildIndividualReportPdf } from './individualReportPdf';

describe('individual PDF with optional TIPS evaluation', () => {
  it('keeps the original PDF without an empty TIPS page', async () => {
    const report = createIndividualReport('QA Scout');
    report.players[0].name = 'QA Player';
    const pdf = await buildIndividualReportPdf(report);
    expect(pdf.getNumberOfPages()).toBe(1);
  });

  it('adds a separate TIPS evaluation when the Scout entered TIPS data', async () => {
    const report = createIndividualReport('QA Scout');
    report.players[0].name = 'QA Player';
    report.tips_evaluation = createEmptyTipsEvaluation();
    report.tips_evaluation.attributes.first_touch.score = 8;
    report.tips_evaluation.attributes.first_touch.notes = 'Synthetic QA note';
    const pdf = await buildIndividualReportPdf(report);
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
  });
});
