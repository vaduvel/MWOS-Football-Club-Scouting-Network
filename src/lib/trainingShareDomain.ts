import { format, parseISO } from 'date-fns';

type TrainingShareDay = {
  weekday: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
};

export function buildTrainingWhatsAppMessage(input: {
  mode: 'single_day' | 'weekly_summary';
  teamName: string;
  weekLabel: string;
  days: TrainingShareDay[];
}) {
  const blocks = input.days.map((day) => {
    const lines = [
      input.teamName,
      formatTrainingShareDate(day.weekday, day.date),
      day.location ? `Venue: ${day.location}` : '',
      day.startTime ? `Training starts ${formatTrainingShareTime(day.startTime)}` : '',
      day.endTime ? `Ends ${formatTrainingShareTime(day.endTime)}` : '',
      day.notes || '',
    ].filter(Boolean);

    return lines.join('\n');
  });

  if (input.mode === 'single_day') {
    return blocks[0] || input.teamName;
  }

  return [input.teamName, input.weekLabel, '', ...blocks].join('\n').trim();
}

function formatTrainingShareDate(weekday: string, isoDate: string) {
  try {
    return format(parseISO(isoDate), 'EEEE d MMMM yyyy');
  } catch {
    return `${weekday} ${isoDate}`.trim();
  }
}

function formatTrainingShareTime(value: string) {
  const normalized = value.trim();
  const secondsMatch = normalized.match(/^(\d{2}:\d{2})(?::\d{2})$/);
  if (secondsMatch?.[1]) {
    return secondsMatch[1];
  }

  return normalized;
}

export function buildTrainingWhatsAppShareUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
