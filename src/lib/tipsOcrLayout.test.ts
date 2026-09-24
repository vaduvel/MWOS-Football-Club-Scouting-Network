import { describe, expect, it } from 'vitest';
import { extractTipsLayout } from '../../netlify/functions/_tips-ocr-layout.js';

function mockAnnotation(entries: Array<[string, number, number]>, scaleX = 2, scaleY = 2) {
  return {
    pages: [{ blocks: [{ paragraphs: [{ words: entries.map(([text, x, y]) => ({
      symbols: [...text].map(character => ({ text: character })),
      boundingBox: { vertices: [
        { x: x * scaleX - 6, y: y * scaleY - 5 },
        { x: x * scaleX + 6, y: y * scaleY - 5 },
        { x: x * scaleX + 6, y: y * scaleY + 5 },
        { x: x * scaleX - 6, y: y * scaleY + 5 },
      ] },
    })) }] }] }],
  };
}

const anchors: Array<[string, number, number]> = [
  ['TECHNIQUE', 163, 238], ['INTELLIGENCE', 474, 238],
  ['PERSONALITY', 170, 514], ['SPEED', 442, 514],
];

describe('approved 2027 TIPS paper layout OCR', () => {
  it('uses the printed boxes to associate handwriting with identity, scores and notes', () => {
    const annotation = mockAnnotation([
      ...anchors,
      ['QA', 75, 171], ['PLAYER', 95, 171], ['CM', 225, 171],
      ['Right', 380, 171], ['TEST', 75, 209], ['CLUB', 100, 209],
      ['24/09/2026', 380, 209],
      ['8', 169, 300], ['Excellent', 220, 300], ['touch', 267, 300],
      ['10', 470, 300], ['Looks', 516, 300], ['ahead', 558, 300],
      ['Strong', 75, 777], ['runner', 126, 777],
      ['Balanced', 78, 820],
    ]);
    const result = extractTipsLayout(annotation);
    expect(result.recognized).toBe(true);
    expect(result.playerFields).toMatchObject({ player_name: 'QA PLAYER', club: 'TEST CLUB', position: 'CM', date: '2026-09-24' });
    expect(result.fields).toMatchObject({
      positions: 'CM', preferredFoot: 'Right', first_touch: '8', first_touch_notes: 'Excellent touch',
      scanning: '10', scanning_notes: 'Looks ahead', otherNotes: 'Strong runner', physicality: 'Balanced',
    });
    expect(result.fields.overallAssessment).toBeUndefined();
  });

  it('does not invent values from an otherwise blank printed sheet', () => {
    const result = extractTipsLayout(mockAnnotation(anchors));
    expect(result).toMatchObject({ recognized: true, fields: {}, playerFields: {}, warnings: [] });
  });

  it('withholds out-of-range or ambiguous handwriting instead of assigning a score', () => {
    const result = extractTipsLayout(mockAnnotation([...anchors, ['11', 169, 300], ['great', 220, 300]]));
    expect(result.fields.first_touch).toBeUndefined();
    expect(result.fields.first_touch_notes).toBe('great');
    expect(result.warnings.join(' ')).toContain('first touch score needs review');
  });

  it('refuses to map cells when the four printed anchors do not align', () => {
    expect(extractTipsLayout(mockAnnotation(anchors.slice(0, 3))).recognized).toBe(false);
    expect(extractTipsLayout(mockAnnotation([...anchors.slice(0, 3), ['SPEED', 200, 514]])).recognized).toBe(false);
  });
});
