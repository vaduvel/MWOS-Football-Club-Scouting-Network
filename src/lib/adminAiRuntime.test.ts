import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  generateAdminChatReply,
  generateAdminInsights,
  getAdminAiRuntimeStatus,
} from '../../server/admin-ai.js';

const originalGeminiApiKey = process.env.GEMINI_API_KEY;
const originalGoogleApiKey = process.env.GOOGLE_API_KEY;

type MockResponsePayload = {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
};

function createMockResponse(payload: MockResponsePayload) {
  return {
    ok: payload.ok,
    status: payload.status ?? (payload.ok ? 200 : 500),
    json: payload.json,
  };
}

describe('admin-ai runtime', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    delete process.env.GOOGLE_API_KEY;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (originalGeminiApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalGeminiApiKey;
    }

    if (originalGoogleApiKey === undefined) {
      delete process.env.GOOGLE_API_KEY;
    } else {
      process.env.GOOGLE_API_KEY = originalGoogleApiKey;
    }
  });

  it('calls the Gemini HTTP API and parses structured admin insights', async () => {
    fetchMock.mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      headline: 'Coverage is improving.',
                      suggestions: [
                        {
                          title: 'Reassign sparse fixtures',
                          rationale: 'Two scouts are overloaded while one has no fresh reports.',
                          action: 'Shift one U19 assignment to the idle scout this week.',
                        },
                      ],
                      watchouts: ['Watch U17 reporting consistency.'],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const result = await generateAdminInsights({ totalReports: 8, activeScouts: 3 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/models/gemini-2.5-flash:generateContent');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-goog-api-key': 'test-gemini-key',
    });

    const body = JSON.parse(String(options?.body));
    expect(body.generationConfig).toMatchObject({
      temperature: 0.4,
      responseMimeType: 'application/json',
    });
    expect(result).toEqual({
      headline: 'Coverage is improving.',
      suggestions: [
        {
          title: 'Reassign sparse fixtures',
          rationale: 'Two scouts are overloaded while one has no fresh reports.',
          action: 'Shift one U19 assignment to the idle scout this week.',
        },
      ],
      watchouts: ['Watch U17 reporting consistency.'],
    });
  });

  it('falls back cleanly when insights response text is not valid JSON', async () => {
    fetchMock.mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'This is not JSON.' }],
              },
            },
          ],
        }),
      }),
    );

    const result = await generateAdminInsights({ totalReports: 2 });

    expect(result).toEqual({
      headline: 'AI returned a non-JSON response.',
      suggestions: [],
      watchouts: ['Retry insight generation after more report data is available.'],
    });
  });

  it('returns the generated chat text from the Gemini HTTP API', async () => {
    fetchMock.mockResolvedValue(
      createMockResponse({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Review the U19 pipeline first, then the inactive scouts.' }],
              },
            },
          ],
        }),
      }),
    );

    const result = await generateAdminChatReply(
      { totalReports: 10 },
      [{ role: 'user', content: 'Where should I focus first?' }],
    );

    expect(result).toEqual({
      reply: 'Review the U19 pipeline first, then the inactive scouts.',
    });
  });

  it('surfaces API error messages when Gemini returns a failed response', async () => {
    fetchMock.mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            message: 'Quota exceeded for this project.',
          },
        }),
      }),
    );

    await expect(generateAdminChatReply({ totalReports: 10 }, [{ role: 'user', content: 'Try again' }])).rejects.toThrow(
      'Quota exceeded for this project.',
    );
  });

  it('reports ready runtime status when a Gemini key is configured', () => {
    const status = getAdminAiRuntimeStatus();

    expect(status).toMatchObject({
      configured: true,
      provider: 'Gemini',
      model: 'gemini-2.5-flash',
      configuredEnvVar: 'GEMINI_API_KEY',
    });
    expect(status.acceptedEnvVars).toEqual(['GEMINI_API_KEY', 'GOOGLE_API_KEY']);
  });

  it('reports setup-required runtime status when no Gemini key is configured', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const status = getAdminAiRuntimeStatus();

    expect(status.configured).toBe(false);
    expect(status.configuredEnvVar).toBeNull();
    expect(status.setupHint).toContain('GEMINI_API_KEY');
  });
});
