// Coordinates are from the approved one-page "MWOS TIPS Scouting Report 2027" PDF.
// Printed section headings anchor the form, so an ordinary crop or scale does not
// move handwritten values into a different player's field.
const ANCHORS = {
  technique: [163, 238],
  intelligence: [474, 238],
  personality: [170, 514],
  speed: [442, 514],
};

const DETAILS = [
  ['player_name', 48, 190, 158, 181],
  ['positions', 200, 342, 158, 181],
  ['preferredFoot', 353, 496, 158, 181],
  ['nationality', 507, 650, 158, 181],
  ['club', 48, 190, 196, 219],
  ['matchObserved', 200, 342, 196, 219],
  ['date', 353, 496, 196, 219],
  ['competitionLevel', 507, 650, 196, 219],
  ['otherNotes', 45, 650, 765, 788],
  ['physicality', 45, 650, 808, 831],
];

const ROWS = [
  // left upper table: Technique
  ['first_touch', 'left', 288, 314], ['passing', 'left', 315, 337],
  ['receiving', 'left', 338, 360], ['dribbling', 'left', 361, 383],
  ['ball_protection', 'left', 384, 406], ['weak_foot', 'left', 407, 429],
  ['heading', 'left', 430, 451], ['finishing', 'left', 452, 477],
  // right upper table: Intelligence
  ['scanning', 'right', 288, 314], ['play_forward', 'right', 315, 337],
  ['problem_solving', 'right', 338, 360], ['movement_before_receiving', 'right', 361, 397],
  ['recognise_space', 'right', 398, 423], ['adaptability', 'right', 424, 446],
  ['off_ball_movement', 'right', 447, 473], ['vision', 'right', 474, 500],
  // left lower table: Personality
  ['leadership', 'left', 565, 588], ['competitiveness', 'left', 589, 611],
  ['bravery', 'left', 612, 635], ['coachability', 'left', 636, 658],
  ['communication', 'left', 659, 681], ['reaction_after_mistakes', 'left', 682, 705],
  ['body_language_work_ethic', 'left', 706, 735],
  // right lower table: Speed
  ['acceleration_pace', 'right', 565, 593], ['agility', 'right', 594, 616],
  ['reaction_speed', 'right', 617, 639], ['decision_speed', 'right', 640, 662],
  ['playing_speed', 'right', 663, 685], ['thinking_speed', 'right', 686, 707],
  ['stamina_work_rate', 'right', 708, 735],
];

function wordsFromAnnotation(annotation) {
  const words = [];
  for (const page of annotation?.pages || []) for (const block of page.blocks || []) {
    for (const paragraph of block.paragraphs || []) for (const word of paragraph.words || []) {
      const text = (word.symbols || []).map(symbol => symbol.text || '').join('').trim();
      const vertices = word.boundingBox?.vertices || [];
      const xs = vertices.map(point => point.x || 0);
      const ys = vertices.map(point => point.y || 0);
      if (!text || xs.length < 4 || ys.length < 4) continue;
      words.push({ text, x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 });
    }
  }
  return words;
}

function findAnchor(words, name) {
  const candidates = words.filter(word => word.text.toLowerCase().replace(/[^a-z]/g, '') === name);
  return candidates[0] || null;
}

function templateTransform(words) {
  const technique = findAnchor(words, 'technique');
  const intelligence = findAnchor(words, 'intelligence');
  const personality = findAnchor(words, 'personality');
  const speed = findAnchor(words, 'speed');
  if (!technique || !intelligence || !personality || !speed) return null;
  const scaleX = (intelligence.x - technique.x) / (ANCHORS.intelligence[0] - ANCHORS.technique[0]);
  const scaleY = (personality.y - technique.y) / (ANCHORS.personality[1] - ANCHORS.technique[1]);
  if (scaleX <= 0 || scaleY <= 0) return null;
  const offsetX = technique.x - scaleX * ANCHORS.technique[0];
  const offsetY = technique.y - scaleY * ANCHORS.technique[1];
  const predictedSpeedX = offsetX + scaleX * ANCHORS.speed[0];
  const predictedSpeedY = offsetY + scaleY * ANCHORS.speed[1];
  // A badly tilted, folded or cropped page is safer to transcribe manually.
  if (Math.abs(predictedSpeedX - speed.x) > scaleX * 45 ||
      Math.abs(predictedSpeedY - speed.y) > scaleY * 35) return null;
  return word => ({ x: (word.x - offsetX) / scaleX, y: (word.y - offsetY) / scaleY });
}

function textInBox(words, toTemplate, [left, right, top, bottom]) {
  const selected = words.map(word => ({ ...word, ...toTemplate(word) }))
    .filter(word => word.x >= left && word.x < right && word.y >= top && word.y < bottom)
    .sort((a, b) => Math.abs(a.y - b.y) < 5 ? a.x - b.x : a.y - b.y);
  return selected.map(word => word.text).join(' ').replace(/\s+/g, ' ').trim();
}

function isoDate(value) {
  const iso = value.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  const european = value.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  const written = value.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);
  const writtenMonth = written ? ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(written[2].toLowerCase()) + 1 : 0;
  const parts = iso ? [iso[1], iso[2], iso[3]] : european ? [european[3], european[2], european[1]] : written ? [written[3], writtenMonth, written[1]] : null;
  if (!parts) return '';
  const [year, month, day] = parts.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
}

export function extractTipsLayout(annotation) {
  const words = wordsFromAnnotation(annotation);
  const toTemplate = templateTransform(words);
  if (!toTemplate) return { recognized: false, fields: {}, playerFields: {}, warnings: [] };

  const fields = {};
  const playerFields = {};
  const warnings = [];
  for (const [key, left, right, top, bottom] of DETAILS) {
    const value = textInBox(words, toTemplate, [left, right, top, bottom]);
    if (!value) continue;
    if (key === 'date') {
      const date = isoDate(value);
      if (date) playerFields.date = date;
      else warnings.push(`Date of report needs review: ${value}`);
    } else if (key === 'player_name' || key === 'club') playerFields[key] = value.slice(0, 3000);
    else fields[key] = value.slice(0, 3000);
  }
  if (fields.positions) playerFields.position = fields.positions;

  for (const [key, side, top, bottom] of ROWS) {
    const scoreBox = side === 'left' ? [155, 185, top, bottom] : [455, 486, top, bottom];
    const notesBox = side === 'left' ? [189, 320, top, bottom] : [489, 620, top, bottom];
    const scoreText = textInBox(words, toTemplate, scoreBox);
    const noteText = textInBox(words, toTemplate, notesBox);
    if (scoreText) {
      const match = scoreText.match(/^\s*(10|[1-9])\s*$/);
      if (match) fields[key] = match[1];
      else warnings.push(`${key.replace(/_/g, ' ')} score needs review: ${scoreText}`);
    }
    if (noteText) fields[`${key}_notes`] = noteText.slice(0, 3000);
  }
  return { recognized: true, fields, playerFields, warnings };
}
