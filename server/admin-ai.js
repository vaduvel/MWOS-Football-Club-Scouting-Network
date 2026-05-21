const MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const ADMIN_AI_PROVIDER = 'Gemini';

export class AdminAiConfigurationError extends Error {
  constructor(message = 'Admin AI is not configured yet.') {
    super(message);
    this.name = 'AdminAiConfigurationError';
    this.code = 'admin_ai_not_configured';
  }
}

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

function getConfiguredEnvVar() {
  if (process.env.GEMINI_API_KEY) {
    return 'GEMINI_API_KEY';
  }

  if (process.env.GOOGLE_API_KEY) {
    return 'GOOGLE_API_KEY';
  }

  return null;
}

function getApiUrl(model = MODEL) {
  return `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`;
}

function getApiRequestHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  };
}

export function getAdminAiRuntimeStatus() {
  const configuredEnvVar = getConfiguredEnvVar();

  return {
    configured: Boolean(configuredEnvVar),
    provider: ADMIN_AI_PROVIDER,
    model: MODEL,
    configuredEnvVar,
    acceptedEnvVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    setupHint: configuredEnvVar
      ? `${ADMIN_AI_PROVIDER} is ready for admin insights and chat.`
      : `Add GEMINI_API_KEY (preferred) or GOOGLE_API_KEY to the server environment, then redeploy the site.`,
  };
}

function getApiKeyOrThrow() {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new AdminAiConfigurationError(
      'Admin AI is not configured yet. Add GEMINI_API_KEY (preferred) or GOOGLE_API_KEY to the server environment and redeploy.',
    );
  }

  return apiKey;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function extractResponseText(payload) {
  const candidates = safeArray(payload?.candidates);

  for (const candidate of candidates) {
    const parts = safeArray(candidate?.content?.parts);
    const texts = parts
      .map((part) => (typeof part?.text === 'string' ? part.text.trim() : ''))
      .filter(Boolean);

    if (texts.length > 0) {
      return texts.join('\n');
    }
  }

  return '';
}

async function callGemini(prompt, { temperature, responseMimeType } = {}) {
  const apiKey = getApiKeyOrThrow();
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: getApiRequestHeaders(apiKey),
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
        ...(responseMimeType ? { responseMimeType } : {}),
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload?.error?.message === 'string' && payload.error.message.trim()
        ? payload.error.message.trim()
        : `Gemini request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return extractResponseText(payload);
}

function normalizeInsightPayload(payload) {
  return {
    headline:
      typeof payload?.headline === 'string' && payload.headline.trim()
        ? payload.headline.trim()
        : 'AI summary unavailable.',
    suggestions: safeArray(payload?.suggestions)
      .map((item) => ({
        title: typeof item?.title === 'string' ? item.title.trim() : '',
        rationale: typeof item?.rationale === 'string' ? item.rationale.trim() : '',
        action: typeof item?.action === 'string' ? item.action.trim() : '',
      }))
      .filter((item) => item.title && item.rationale && item.action)
      .slice(0, 4),
    watchouts: safeArray(payload?.watchouts)
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .slice(0, 4),
  };
}

export async function generateAdminInsights(context) {
  const rawText =
    (await callGemini(
      [
        'You are an operations assistant for a football scouting department.',
        'Review the admin dashboard data and return concise, actionable suggestions.',
        'Focus on process improvement, scout activity, report quality, player follow-up and decision-making.',
        'Return JSON only with this shape:',
        '{"headline":"string","suggestions":[{"title":"string","rationale":"string","action":"string"}],"watchouts":["string"]}',
        'Keep suggestions practical and tied to the provided data only.',
        `Data: ${JSON.stringify(context)}`,
      ].join('\n'),
      {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    )) || '{}';

  try {
    return normalizeInsightPayload(JSON.parse(rawText));
  } catch (error) {
    return normalizeInsightPayload({
      headline: 'AI returned a non-JSON response.',
      suggestions: [],
      watchouts: ['Retry insight generation after more report data is available.'],
    });
  }
}

export async function generateAdminChatReply(context, messages) {
  const normalizedMessages = safeArray(messages)
    .map((message) => ({
      role: message?.role === 'assistant' ? 'assistant' : 'user',
      content: typeof message?.content === 'string' ? message.content.trim() : '',
    }))
    .filter((message) => message.content.length > 0)
    .slice(-10);

  const conversation = normalizedMessages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n');

  const reply = await callGemini(
    [
      'You are an admin-only football scouting operations assistant.',
      'Answer based only on the supplied dashboard context and the conversation.',
      'Be concise, practical and specific. Use bullet points when useful.',
      'If the request asks for a decision, ground it in the data. Do not invent hidden report details.',
      `Dashboard context: ${JSON.stringify(context)}`,
      `Conversation:\n${conversation}`,
    ].join('\n\n'),
    {
      temperature: 0.55,
    },
  );

  if (!reply) {
    return {
      reply: 'No answer was generated. Try asking the admin assistant again with a more specific question.',
    };
  }

  return { reply };
}
