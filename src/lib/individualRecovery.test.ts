import { describe, expect, it } from 'vitest';
import { createIndividualReport, recoverIndividualDraft } from './individualReportDomain';
import { buildIndividualReportPdf } from './individualReportPdf';

describe('individual recovery and export', () => {
  it('recovers a new draft despite a newly generated initial ID', () => {
    const draft = createIndividualReport('QA'); draft.players[0].name = 'Recovered player';
    expect(recoverIndividualDraft(JSON.stringify(draft), createIndividualReport('QA'), true)).toEqual(draft);
  });
  it('does not mix existing report drafts or accept malformed data', () => {
    const draft = createIndividualReport('QA');
    expect(recoverIndividualDraft(JSON.stringify(draft), createIndividualReport('QA'), false)).toBeNull();
    expect(recoverIndividualDraft('{', draft, true)).toBeNull();
    expect(recoverIndividualDraft(JSON.stringify({...draft, reviews: []}), draft, true)).toBeNull();
  });
  it('exports an actual PDF and paginates long evaluations', async () => {
    const draft = createIndividualReport('QA'); draft.players[0].name = 'Export player';
    draft.tips_evaluation!.legacyReviewEnabled = true;
    draft.reviews[0].overview = 'Long evaluation with repeated notes. '.repeat(300);
    const pdf = await buildIndividualReportPdf(draft);
    expect(pdf.getNumberOfPages()).toBeGreaterThan(2);
    expect(new TextDecoder().decode(pdf.output('arraybuffer')).startsWith('%PDF-')).toBe(true);
    if (process.env.QA_PDF_SAMPLE === '1') {
      pdf.save('output/scout-fixes-20260913/individual-long.pdf');
      draft.reviews[0].overview = 'Synthetic evaluation, no real player data.';
      draft.reviews[0].strengths = 'Passing and vision';
      const sample = await buildIndividualReportPdf(draft);
      sample.save('output/scout-fixes-20260913/individual-sample.pdf');
    }
  });
});
