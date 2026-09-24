import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TipsEvaluationSection from './TipsEvaluationSection';
import { createEmptyTipsEvaluation } from '../../lib/tipsEvaluationDomain';

describe('TIPS evaluation entry surface', () => {
  it('makes the TIPS entry point visible on historical reports without altering the 1-5 review', () => {
    const html = renderToStaticMarkup(createElement(TipsEvaluationSection, { value: null, disabled: false, onChange: () => {} }));
    expect(html).toContain('Start TIPS evaluation');
    expect(html).toContain('existing 1–5 review stays intact');
  });

  it('renders all four source sections and editable 1-10 criteria', () => {
    const html = renderToStaticMarkup(createElement(TipsEvaluationSection, { value: createEmptyTipsEvaluation(), disabled: false, onChange: () => {} }));
    for (const section of ['Technique', 'Intelligence', 'Personality', 'Speed']) expect(html).toContain(section);
    expect(html).toContain('First touch score out of 10');
    expect(html).toContain('Stamina &amp; work rate score out of 10');
    expect(html).toContain('Overall assessment');
    expect(html).toContain('Main scouting form');
  });
});
