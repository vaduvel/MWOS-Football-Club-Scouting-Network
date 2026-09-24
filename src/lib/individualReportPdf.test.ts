import { describe, expect, it } from 'vitest';
import { createIndividualReport } from './individualReportDomain';
import { createEmptyTipsEvaluation } from './tipsEvaluationDomain';
import { buildIndividualReportPdf } from './individualReportPdf';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

async function firstPageText(pdf: Awaited<ReturnType<typeof buildIndividualReportPdf>>) {
  const document = await getDocument({ data: new Uint8Array(pdf.output('arraybuffer')), useSystemFonts: true }).promise;
  const page = await document.getPage(1);
  const content = await page.getTextContent();
  return content.items.map(item => 'str' in item ? item.str : '').join(' ');
}

describe('individual PDF with TIPS as the primary evaluation', () => {
  it('does not export an untouched placeholder 1-5 evaluation', async () => {
    const report = createIndividualReport('QA Scout');
    report.players[0].name = 'QA Player';
    const pdf = await buildIndividualReportPdf(report);
    expect(pdf.getNumberOfPages()).toBe(1);
    expect(await firstPageText(pdf)).not.toContain('Evaluation (1-5)');
  });

  it('puts entered TIPS scores before the optional previous evaluation', async () => {
    const report = createIndividualReport('QA Scout');
    report.players[0].name = 'QA Player';
    report.tips_evaluation = createEmptyTipsEvaluation();
    report.tips_evaluation.attributes.first_touch.score = 8;
    report.tips_evaluation.attributes.first_touch.notes = 'Synthetic QA note';
    const pdf = await buildIndividualReportPdf(report);
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
    expect(await firstPageText(pdf)).toContain('TIPS PLAYER EVALUATION (1-10)');
    expect(await firstPageText(pdf)).not.toContain('PREVIOUS PLAYER EVALUATION (1-5)');

    report.tips_evaluation.legacyReviewEnabled = true;
    const withPrevious = await buildIndividualReportPdf(report);
    expect(withPrevious.getNumberOfPages()).toBeGreaterThan(pdf.getNumberOfPages());
    expect(await firstPageText(withPrevious)).toContain('TIPS PLAYER EVALUATION (1-10)');
  });

  it('keeps historical 1-5 reports exportable', async () => {
    const report = createIndividualReport('QA Scout');
    report.players[0].name = 'QA Historical';
    report.tips_evaluation = null;
    const pdf = await buildIndividualReportPdf(report);
    expect(await firstPageText(pdf)).toContain('Evaluation (1-5)');
  });
});
