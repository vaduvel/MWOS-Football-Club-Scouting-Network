import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-2.5-flash';

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

function getClient() {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY.');
  }

  return new GoogleGenAI({ apiKey });
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
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
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              'You are an operations assistant for a football scouting department.',
              'Review the admin dashboard data and return concise, actionable suggestions.',
              'Focus on process improvement, scout activity, report quality, player follow-up and decision-making.',
              'Return JSON only with this shape:',
              '{"headline":"string","suggestions":[{"title":"string","rationale":"string","action":"string"}],"watchouts":["string"]}',
              'Keep suggestions practical and tied to the provided data only.',
              `Data: ${JSON.stringify(context)}`,
            ].join('\n'),
          },
        ],
      },
    ],
    config: {
      temperature: 0.4,
      responseMimeType: 'application/json',
    },
  });

  const rawText = response.text?.trim() || '{}';

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
  const ai = getClient();
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

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              'You are an admin-only football scouting operations assistant.',
              'Answer based only on the supplied dashboard context and the conversation.',
              'Be concise, practical and specific. Use bullet points when useful.',
              'If the request asks for a decision, ground it in the data. Do not invent hidden report details.',
              `Dashboard context: ${JSON.stringify(context)}`,
              `Conversation:\n${conversation}`,
            ].join('\n\n'),
          },
        ],
      },
    ],
    config: {
      temperature: 0.55,
    },
  });

  const reply = response.text?.trim();

  if (!reply) {
    return {
      reply: 'No answer was generated. Try asking the admin assistant again with a more specific question.',
    };
  }

  return { reply };
}
