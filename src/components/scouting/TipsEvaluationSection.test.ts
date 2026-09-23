import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TipsEvaluationSection from './TipsEvaluationSection';
import { createEmptyTipsEvaluation } from '../../lib/tipsEvaluationDomain';

describe('TIPS evaluation entry surface', () => {
  it('makes the optional entry point visible without altering the 1-5 review', () => {
    const html = renderToStaticMarkup(createElement(TipsEvaluationSection, { value: null, disabled: false, onChange: () => {} }));
    expect(html).toContain('Add TIPS evaluation');
    expect(html).toContain('Existing 1-5 scores stay unchanged');
  });

  it('renders all four source sections and editable 1-10 criteria', () => {
    const html = renderToStaticMarkup(createElement(TipsEvaluationSection, { value: createEmptyTipsEvaluation(), disabled: false, onChange: () => {} }));
    for (const section of ['Technique', 'Intelligence', 'Personality', 'Speed']) expect(html).toContain(section);
    expect(html).toContain('First touch score out of 10');
    expect(html).toContain('Stamina &amp; work rate score out of 10');
    expect(html).toContain('Overall assessment');
  });
});
