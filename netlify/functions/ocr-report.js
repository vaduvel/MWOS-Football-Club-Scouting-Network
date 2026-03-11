import { json, requireAuthenticatedUser } from './_shared.js';

const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
const OCR_FIELDS = [
  'competition',
  'date',
  'venue',
  'kickoff',
  'weather',
  'pitch',
  'home_team',
  'home_score',
  'away_team',
  'away_score',
  'home_manager',
  'away_manager',
  'focus',
];

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function extractLabeledValue(lines, labels) {
  for (const line of lines) {
    for (const label of labels) {
      const regex = new RegExp(`^${label}\\s*[:\\-]?\\s*(.+)$`, 'i');
      const match = line.match(regex);
      if (match?.[1]) {
        return normalizeWhitespace(match[1]);
      }
    }
  }

  return '';
}

function extractFixture(lines) {
  const fixtureLine = lines.find((line) => /\b(vs|v)\b/i.test(line) || /\d+\s*[-:]\s*\d+/.test(line));
  if (!fixtureLine) {
    return {};
  }

  const sanitized = fixtureLine.replace(/\s+/g, ' ').trim();
  const scoreMatch = sanitized.match(/(\d{1,2})\s*[-:]\s*(\d{1,2})/);

  if (/\bvs\b/i.test(sanitized)) {
    const [left, right] = sanitized.split(/\bvs\b/i).map((part) => normalizeWhitespace(part));
    const homeTeam = left.replace(/\d+\s*[-:]\s*\d+/, '').trim();
    const awayTeam = right.replace(/\d+\s*[-:]\s*\d+/, '').trim();

    return {
      home_team: homeTeam || undefined,
      away_team: awayTeam || undefined,
      home_score: scoreMatch ? Number(scoreMatch[1]) : undefined,
      away_score: scoreMatch ? Number(scoreMatch[2]) : undefined,
    };
  }

  return {
    home_score: scoreMatch ? Number(scoreMatch[1]) : undefined,
    away_score: scoreMatch ? Number(scoreMatch[2]) : undefined,
  };
}

function extractDate(text) {
  const match = text.match(/\b(20\d{2}-\d{2}-\d{2}|\d{2}[./-]\d{2}[./-]\d{4})\b/);
  if (!match) {
    return '';
  }

  const value = match[1];
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [day, month, year] = value.split(/[./-]/);
  return `${year}-${month}-${day}`;
}

function extractKickoff(text) {
  const match = text.match(/\b([01]?\d|2[0-3])[:.][0-5]\d\b/);
  return match ? match[0].replace('.', ':') : '';
}

function extractFocus(lines) {
  return extractLabeledValue(lines, ['focus', 'objective', 'report focus']);
}

function pickSuggestionValue(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  return value ? normalizeWhitespace(value) : undefined;
}

function buildSuggestions(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const fixture = extractFixture(lines);
  const suggestions = {
    competition: extractLabeledValue(lines, ['competition', 'league']),
    date: extractDate(text),
    venue: extractLabeledValue(lines, ['venue', 'stadium', 'location']),
    kickoff: extractKickoff(text) || extractLabeledValue(lines, ['kickoff', 'kick-off', 'time']),
    weather: extractLabeledValue(lines, ['weather']),
    pitch: extractLabeledValue(lines, ['pitch', 'pitch condition']),
    home_team: fixture.home_team,
    home_score: fixture.home_score,
    away_team: fixture.away_team,
    away_score: fixture.away_score,
    home_manager: extractLabeledValue(lines, ['home manager', 'manager home']),
    away_manager: extractLabeledValue(lines, ['away manager', 'manager away']),
    focus: extractFocus(lines),
  };

  return Object.fromEntries(
    Object.entries(suggestions)
      .map(([key, value]) => [key, pickSuggestionValue(value)])
      .filter(([, value]) => value !== undefined && value !== ''),
  );
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const auth = await requireAuthenticatedUser(event);
  if (auth.error) {
    return auth.error;
  }

  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    return json(500, { error: 'Missing GOOGLE_CLOUD_VISION_API_KEY.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const { content, mimeType, fileName } = payload;

  if (!content || typeof content !== 'string') {
    return json(400, { error: 'Missing image content.' });
  }

  if (!mimeType || typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
    return json(400, { error: 'Only image uploads are supported right now.' });
  }

  const imageSize = Buffer.byteLength(content, 'base64');
  if (imageSize > MAX_IMAGE_BYTES) {
    return json(400, { error: 'Image is too large. Use a file under 7 MB.' });
  }

  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content,
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION',
              },
            ],
            imageContext: {
              languageHints: ['en-t-i0-handwrit'],
            },
          },
        ],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error?.message || 'Vision OCR request failed.');
    }

    const annotation = result?.responses?.[0];
    if (annotation?.error?.message) {
      throw new Error(annotation.error.message);
    }

    const rawText = annotation?.fullTextAnnotation?.text || annotation?.textAnnotations?.[0]?.description || '';

    if (!rawText.trim()) {
      return json(200, {
        text: '',
        suggestions: {},
        fileName: fileName || 'upload',
        mimeType,
        lineCount: 0,
      });
    }

    return json(200, {
      text: rawText.trim(),
      suggestions: buildSuggestions(rawText),
      fileName: fileName || 'upload',
      mimeType,
      lineCount: rawText.split(/\n+/).filter((line) => line.trim().length > 0).length,
    });
  } catch (error) {
    return json(500, { error: error.message || 'Vision OCR failed.' });
  }
}
