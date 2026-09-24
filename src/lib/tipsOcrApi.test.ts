import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../netlify/functions/_shared.js', () => ({
  json: (statusCode: number, payload: unknown) => ({ statusCode, body: JSON.stringify(payload) }),
  requireAuthenticatedUser: async () => ({ user: { id: 'qa-scout' } }),
}));

import { handler } from '../../netlify/functions/ocr-report.js';

const originalKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
const words = [
  ['TECHNIQUE', 163, 238], ['INTELLIGENCE', 474, 238],
  ['PERSONALITY', 170, 514], ['SPEED', 442, 514], ['8', 169, 300],
].map(([text, x, y]) => ({
  symbols: [...String(text)].map(character => ({ text: character })),
  boundingBox: { vertices: [
    { x: Number(x) - 3, y: Number(y) - 3 }, { x: Number(x) + 3, y: Number(y) - 3 },
    { x: Number(x) + 3, y: Number(y) + 3 }, { x: Number(x) - 3, y: Number(y) + 3 },
  ] },
}));

describe('TIPS OCR function integration', () => {
  beforeEach(() => {
    process.env.GOOGLE_CLOUD_VISION_API_KEY = 'qa-test-key';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ responses: [{ fullTextAnnotation: { text: 'TIPS Methodology\n8', pages: [{ blocks: [{ paragraphs: [{ words }] }] }] } }] }),
    })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.GOOGLE_CLOUD_VISION_API_KEY;
    else process.env.GOOGLE_CLOUD_VISION_API_KEY = originalKey;
  });

  it('returns cell proposals only for the requested TIPS template', async () => {
    const base = { httpMethod: 'POST', headers: {}, body: JSON.stringify({ content: 'AQID', mimeType: 'image/png', fileName: 'qa.png', template: 'tips-2027' }) };
    const response = await handler(base);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).tipsLayout).toMatchObject({ recognized: true, fields: { first_touch: '8' } });
    const generic = await handler({ ...base, body: JSON.stringify({ content: 'AQID', mimeType: 'image/png' }) });
    expect(JSON.parse(generic.body).tipsLayout).toBeUndefined();
  });
});
