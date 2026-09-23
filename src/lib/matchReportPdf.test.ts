import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { PlayerReview, Report } from '../store/report';
import { buildMatchReportPdf } from './matchReportPdf';

function makeReport(): Report {
  return {
    competition: 'QA League', date: '2026-09-20', venue: 'QA Ground', kickoff: '15:00',
    weather: 'Clear', pitch: 'Good', home_team: 'QA Home', home_score: 2,
    away_team: 'QA Away', away_score: 1, scout_name: 'QA Scout', focus: 'Player development',
    general_notes: 'Match observations.', home_manager: '', away_manager: '',
    formation_home: '4-3-3', formation_away: '4-4-2',
    players: [{ id: 'player-1', team_side: 'home', shirt_number: 9, name: 'Evaluated player', subbed: '', goal: '1', rating: 9, position_x: 50, position_y: 50 }],
    reviews: [{
      id: 'review-1', player_id: 'player-1', overview: 'Good match performance.',
      strengths: 'Passing and vision.', areas_to_improve: 'Weak-foot control.',
      pace: 1, strength: 2, stamina: 3, agility: 4,
      decision_making: 5, composure: 1, work_rate: 2, positioning: 3,
      recommendation_verdict: 'Monitor closely', potential_level: 'Academy',
    }],
  };
}

async function readPdfPages(report: Report) {
  const pdf = await buildMatchReportPdf(report);
  const loadingTask = getDocument({ data: new Uint8Array(pdf.output('arraybuffer')), useSystemFonts: true });
  const document = await loadingTask.promise;
  try {
    const pages: { items: TextItem[]; height: number }[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push({ items: content.items.filter((item): item is TextItem => 'str' in item), height: page.getViewport({ scale: 1 }).height });
    }
    return pages;
  } finally {
    await loadingTask.destroy();
  }
}

const expectedScores = [
  'Pace: 1/5', 'Strength: 2/5', 'Stamina: 3/5', 'Agility: 4/5',
  'Decision making: 5/5', 'Composure: 1/5', 'Work rate: 2/5', 'Positioning: 3/5',
];

describe('match report PDF', () => {
  it('omits formation diagrams for unpositioned default team-sheet players', async () => {
    const report = makeReport();
    report.players.push({ ...report.players[0], id: 'away-1', team_side: 'away', name: 'Away player' });
    const pages = await readPdfPages(report);
    expect(pages).toHaveLength(2);
    expect(pages.flatMap((page) => page.items.map((item) => item.str))).not.toContain('QA Home - 4-3-3');

    report.players[0].position_y = 90;
    const partlyPositionedPages = await readPdfPages(report);
    expect(partlyPositionedPages).toHaveLength(3);
    expect(partlyPositionedPages.flatMap((page) => page.items.map((item) => item.str))).toContain('QA Home - 4-3-3');
    expect(partlyPositionedPages.flatMap((page) => page.items.map((item) => item.str))).not.toContain('QA Away - 4-4-2');
  });

  it('exports all eight saved evaluation scores with their own labels and scale', async () => {
    const pages = await readPdfPages(makeReport());
    const reviewPage = pages.find((page) => page.items.some((item) => item.str === 'PLAYER REVIEWS'));
    expect(reviewPage).toBeDefined();
    const text = reviewPage!.items.map((item) => item.str);
    expect(text).toContain('Evaluated player - Academy');
    expect(text).toContain('Evaluation (1-5)');
    for (const score of expectedScores) expect(text.filter((line) => line === score)).toHaveLength(1);
    expect(text).toContain('Good match performance.');
    expect(text).toContain('Monitor closely');
    // The team-sheet match rating remains distinct from the /5 evaluation.
    expect(text.some((line) => line.includes('9/5'))).toBe(false);
  });

  it('keeps every review score block with its player and paginates long notes without clipping', async () => {
    const report = makeReport();
    const firstReview = report.reviews[0];
    report.players = Array.from({ length: 6 }, (_, index) => ({ ...report.players[0], id: `player-${index}`, name: `Review player ${index}` }));
    report.reviews = report.players.map((player, index): PlayerReview => ({
      ...firstReview,
      id: `review-${index}`, player_id: player.id,
      overview: index === 0 ? Array.from({ length: 120 }, (_, line) => `Observation ${line + 1}: player retains possession.`).join('\n') : firstReview.overview,
    }));
    const pages = await readPdfPages(report);
    const reviewPages = pages.slice(pages.findIndex((page) => page.items.some((item) => item.str === 'PLAYER REVIEWS')));
    expect(reviewPages.length).toBeGreaterThan(3);
    for (const player of report.players) {
      const page = reviewPages.find((entry) => entry.items.some((item) => item.str === `${player.name} - Academy`));
      expect(page).toBeDefined();
      const start = page!.items.findIndex((item) => item.str === `${player.name} - Academy`);
      const nextHeading = page!.items.findIndex((item, index) => index > start && item.str.endsWith(' - Academy'));
      const block = page!.items.slice(start, nextHeading < 0 ? undefined : nextHeading).map((item) => item.str);
      for (const score of expectedScores) expect(block).toContain(score);
    }
    for (const page of reviewPages) {
      for (const item of page.items.filter((entry) => entry.str.trim())) {
        expect(item.transform[5]).toBeGreaterThan(40);
        expect(item.transform[5]).toBeLessThan(page.height - 40);
      }
    }
    const allText = reviewPages.flatMap((page) => page.items.map((item) => item.str)).join('\n');
    expect(allText).toContain('Observation 120: player retains possession.');
  });
});
