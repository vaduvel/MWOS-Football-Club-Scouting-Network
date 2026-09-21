import { describe, expect, it } from 'vitest';
import { createIndividualReport } from './individualReportDomain';
import { getReportDraftKey, parseReportDraft, shouldDeleteReportDraft, type DraftRecord } from './reportDraftDomain';

function makeDraft(userId = 'scout-a', reportId?: string): DraftRecord {
  return {
    version: 2,
    userId,
    key: getReportDraftKey(userId, reportId),
    savedAt: '2026-09-21T10:00:00.000Z',
    report: { ...createIndividualReport('QA Scout'), id: reportId ?? 'new-client-id', report_type: 'match' },
  };
}

describe('report draft ownership and recovery', () => {
  it('separates new and existing drafts for each signed-in user without separator collisions', () => {
    const keys = [
      getReportDraftKey('scout-a'), getReportDraftKey('scout-b'),
      getReportDraftKey('scout-a', 'new'), getReportDraftKey('scout-a', 'report-1'),
      getReportDraftKey('scout-b', 'report-1'), getReportDraftKey('a:report:b', 'c'),
      getReportDraftKey('a', 'b:report:c'),
    ];
    expect(new Set(keys).size).toBe(keys.length);
    expect(() => getReportDraftKey('')).toThrow(/authenticated user/);
    expect(() => getReportDraftKey('scout-a', '')).toThrow(/valid report scope/);
  });

  it('recovers the owner’s new draft including its generated client id', () => {
    const draft = makeDraft();
    expect(parseReportDraft(draft, 'scout-a')).toEqual(draft);
    expect(parseReportDraft(draft, 'scout-b')).toBeNull();
    expect(parseReportDraft({ ...draft, key: getReportDraftKey('scout-b') }, 'scout-b')).toBeNull();
  });

  it('requires the envelope, route and saved report id to agree', () => {
    const draft = makeDraft('scout-a', 'report-1');
    expect(parseReportDraft(draft, 'scout-a', 'report-1')).toEqual(draft);
    expect(parseReportDraft(draft, 'scout-a', 'report-2')).toBeNull();
    expect(parseReportDraft(draft, 'scout-a')).toBeNull();
    expect(parseReportDraft({ ...draft, report: { ...draft.report, id: 'report-2' } }, 'scout-a', 'report-1')).toBeNull();
    expect(parseReportDraft({ ...draft, report: { ...draft.report, id: undefined } }, 'scout-a', 'report-1')).toBeNull();
  });

  it('does not migrate legacy drafts with unknown ownership or trust incomplete v2 envelopes', () => {
    const draft = makeDraft();
    const invalid = [
      null, 'not a record', { key: 'report-draft:new', report: draft.report, savedAt: draft.savedAt },
      { ...draft, version: 1 }, { ...draft, userId: undefined }, { ...draft, key: 'report-draft:new' },
      { ...draft, savedAt: 'invalid' },
    ];
    for (const value of invalid) expect(parseReportDraft(value, 'scout-a')).toBeNull();
  });

  it('rejects malformed report and nested player/review data before restoration', () => {
    const draft = makeDraft();
    const malformedReports = [
      null, {}, { ...draft.report, players: null }, { ...draft.report, reviews: {} },
      { ...draft.report, home_team: null }, { ...draft.report, home_score: Number.NaN },
      { ...draft.report, players: [null] },
      { ...draft.report, players: [{ ...draft.report.players[0], name: 42 }] },
      { ...draft.report, reviews: [{ ...draft.report.reviews[0], overview: null }] },
      { ...draft.report, reviews: [{ ...draft.report.reviews[0], pace: Number.NaN }] },
    ];
    for (const report of malformedReports) expect(parseReportDraft({ ...draft, report }, 'scout-a')).toBeNull();
  });

  it('allows a user’s draft of a report originally authored by someone else', () => {
    const draft = makeDraft('editor', 'report-1');
    draft.report.owner_id = 'original-author';
    expect(parseReportDraft(draft, 'editor', 'report-1')).toEqual(draft);
    expect(parseReportDraft(draft, 'original-author', 'report-1')).toBeNull();
  });

  it('preserves an unfinished review before its player is selected', () => {
    const draft = makeDraft();
    draft.report.reviews[0].player_id = '';
    draft.report.reviews[0].overview = 'Notes written before selecting a player';
    expect(parseReportDraft(draft, 'scout-a')).toEqual(draft);
  });
});

describe('report draft deletion after save', () => {
  it('deletes only the unchanged snapshot that was actually saved', () => {
    const draft = makeDraft('scout-a', 'report-1');
    const savedSnapshot = JSON.stringify(draft.report);
    expect(shouldDeleteReportDraft(draft, 'scout-a', 'report-1', savedSnapshot)).toBe(true);

    const newerDraft = { ...draft, report: { ...draft.report, general_notes: 'Typed while save was running' } };
    expect(shouldDeleteReportDraft(newerDraft, 'scout-a', 'report-1', savedSnapshot)).toBe(false);
  });

  it('never clears another owner, another report or an unowned legacy draft', () => {
    const draft = makeDraft('scout-a', 'report-1');
    expect(shouldDeleteReportDraft(draft, 'scout-a', 'report-1')).toBe(true);
    expect(shouldDeleteReportDraft(draft, 'scout-b', 'report-1')).toBe(false);
    expect(shouldDeleteReportDraft(draft, 'scout-a', 'report-2')).toBe(false);
    expect(shouldDeleteReportDraft({ ...draft, userId: undefined }, 'scout-a', 'report-1')).toBe(false);
    expect(shouldDeleteReportDraft(undefined, 'scout-a', 'report-1')).toBe(false);
  });
});
