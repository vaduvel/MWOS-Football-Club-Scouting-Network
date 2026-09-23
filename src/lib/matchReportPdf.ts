import type { Report } from '../store/report';
import { getPositionedPlayersForSide } from './reportProgressDomain';

const PAGE_MARGIN = 16;

function displayValue(value: string | number | null | undefined, fallback = 'Not provided') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

export async function buildMatchReportPdf(report: Report) {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  const addPage = () => {
    pdf.addPage();
    pdf.setTextColor(44, 46, 67);
  };

  const ensureSpace = (y: number, required: number) => {
    if (y + required <= pageHeight - PAGE_MARGIN) return y;
    addPage();
    return PAGE_MARGIN;
  };

  const addSectionTitle = (title: string, y: number) => {
    const nextY = ensureSpace(y, 13);
    pdf.setFillColor(237, 242, 244);
    pdf.rect(PAGE_MARGIN, nextY, contentWidth, 10, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(44, 46, 67);
    pdf.text(title.toUpperCase(), PAGE_MARGIN + 3, nextY + 6.5);
    return nextY + 15;
  };

  const addWrappedText = (label: string, value: string, y: number) => {
    const labelWidth = 34;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    const lines: string[] = pdf.splitTextToSize(value || 'Not provided', contentWidth - labelWidth);
    // A single note can be longer than a page. Keep normal rows together, then
    // paginate oversized values line by line so the following scores stay visible.
    const requiredHeight = Math.max(7, lines.length * 5 + 2);
    let nextY = ensureSpace(y, requiredHeight > pageHeight - PAGE_MARGIN * 2 ? 7 : requiredHeight);
    for (const [index, line] of lines.entries()) {
      const lineY = ensureSpace(nextY, 5);
      if (index === 0 || lineY !== nextY) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(49, 39, 131);
        pdf.text(label, PAGE_MARGIN, lineY);
      }
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(44, 46, 67);
      pdf.text(line, PAGE_MARGIN + labelWidth, lineY);
      nextY = lineY + 5;
    }
    return nextY + 2;
  };

  pdf.setFillColor(49, 39, 131);
  pdf.rect(0, 0, pageWidth, 31, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(19);
  pdf.text('MWOS SCOUTING REPORT', PAGE_MARGIN, 14);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(
    `${displayValue(report.home_team, 'Home')} vs ${displayValue(report.away_team, 'Away')}  |  ${displayValue(report.date)}`,
    PAGE_MARGIN,
    23,
  );

  let y = 40;
  y = addSectionTitle('Match details', y);
  y = addWrappedText('Competition', displayValue(report.competition), y);
  y = addWrappedText('Venue', displayValue(report.venue), y);
  y = addWrappedText('Kick-off', displayValue(report.kickoff), y);
  y = addWrappedText('Conditions', `${displayValue(report.weather)} / ${displayValue(report.pitch)}`, y);
  y = addWrappedText('Scout', displayValue(report.scout_name), y);

  y = addSectionTitle('Final score', y + 2);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(49, 39, 131);
  pdf.text(
    `${displayValue(report.home_team, 'Home')}  ${displayValue(report.home_score, '-')} - ${displayValue(report.away_score, '-')}  ${displayValue(report.away_team, 'Away')}`,
    pageWidth / 2,
    y + 2,
    { align: 'center' },
  );
  y += 13;
  y = addWrappedText('Home manager', displayValue(report.home_manager), y);
  y = addWrappedText('Away manager', displayValue(report.away_manager), y);

  y = addSectionTitle('Scouting notes', y + 2);
  y = addWrappedText('Focus', displayValue(report.focus), y);
  y = addWrappedText('General notes', displayValue(report.general_notes), y);

  y = addSectionTitle('Team sheets and ratings', y + 2);
  if (report.players.length === 0) {
    y = addWrappedText('Players', 'No players were added to this report.', y);
  } else {
    for (const player of report.players) {
      const teamName = player.team_side === 'home' ? report.home_team : report.away_team;
      y = addWrappedText(
        displayValue(player.shirt_number, '-'),
        `${displayValue(player.name, 'Unnamed player')} - ${displayValue(teamName, player.team_side)} - rating ${displayValue(player.rating, '-')}`,
        y,
      );
    }
  }

  const drawFormation = (teamSide: 'home' | 'away', teamName: string, formation: string) => {
    addPage();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor(49, 39, 131);
    pdf.text(`${displayValue(teamName, teamSide)} - ${displayValue(formation, 'Formation')}`, PAGE_MARGIN, 15);

    const pitchX = 28;
    const pitchY = 25;
    const pitchWidth = pageWidth - 56;
    const pitchHeight = pageHeight - 48;
    pdf.setFillColor(71, 145, 83);
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.6);
    pdf.rect(pitchX, pitchY, pitchWidth, pitchHeight, 'FD');
    pdf.line(pitchX, pitchY + pitchHeight / 2, pitchX + pitchWidth, pitchY + pitchHeight / 2);
    pdf.circle(pitchX + pitchWidth / 2, pitchY + pitchHeight / 2, 18);
    pdf.rect(pitchX + pitchWidth * 0.25, pitchY, pitchWidth * 0.5, pitchHeight * 0.15);
    pdf.rect(pitchX + pitchWidth * 0.25, pitchY + pitchHeight * 0.85, pitchWidth * 0.5, pitchHeight * 0.15);

    getPositionedPlayersForSide(report, teamSide)
      .forEach((player) => {
        const playerX = pitchX + (Math.max(0, Math.min(100, player.position_x)) / 100) * pitchWidth;
        const playerY = pitchY + (Math.max(0, Math.min(100, player.position_y)) / 100) * pitchHeight;
        pdf.setFillColor(teamSide === 'home' ? 49 : 190, teamSide === 'home' ? 39 : 23, teamSide === 'home' ? 131 : 23);
        pdf.setDrawColor(255, 255, 255);
        pdf.circle(playerX, playerY, 5, 'FD');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.text(displayValue(player.shirt_number, '-'), playerX, playerY + 2, { align: 'center' });
        pdf.setTextColor(44, 46, 67);
        pdf.setFontSize(6.5);
        pdf.text(displayValue(player.name, 'Unnamed'), playerX, Math.min(pitchY + pitchHeight - 1, playerY + 9), { align: 'center' });
      });
  };

  if (getPositionedPlayersForSide(report, 'home').length > 0) {
    drawFormation('home', report.home_team, report.formation_home);
  }
  if (getPositionedPlayersForSide(report, 'away').length > 0) {
    drawFormation('away', report.away_team, report.formation_away);
  }

  if (report.reviews.length > 0) {
    addPage();
    y = addSectionTitle('Player reviews', PAGE_MARGIN);
    for (const review of report.reviews) {
      const player = report.players.find((candidate) => String(candidate.id) === String(review.player_id));
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      const heading: string[] = pdf.splitTextToSize(`${displayValue(player?.name, 'Unknown player')} - ${displayValue(review.potential_level, 'Potential not set')}`, contentWidth);
      // Keep the player's identity and all eight scores on the same page.
      y = ensureSpace(y, heading.length * 5 + 48);
      pdf.setTextColor(49, 39, 131);
      pdf.text(heading, PAGE_MARGIN, y);
      y += heading.length * 5 + 3;
      pdf.setFontSize(9.5);
      pdf.text('Evaluation (1-5)', PAGE_MARGIN, y);
      y += 7;
      const scores = [
        ['Pace', review.pace], ['Strength', review.strength],
        ['Stamina', review.stamina], ['Agility', review.agility],
        ['Decision making', review.decision_making], ['Composure', review.composure],
        ['Work rate', review.work_rate], ['Positioning', review.positioning],
      ] as const;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(44, 46, 67);
      scores.forEach(([label, value], index) => {
        pdf.text(`${label}: ${displayValue(value, '-')}/5`, PAGE_MARGIN + (index % 2) * contentWidth / 2, y + Math.floor(index / 2) * 7);
      });
      y += 32;
      y = addWrappedText('Overview', displayValue(review.overview), y);
      y = addWrappedText('Strengths', displayValue(review.strengths), y);
      y = addWrappedText('Improve', displayValue(review.areas_to_improve), y);
      y = addWrappedText('Verdict', displayValue(review.recommendation_verdict), y);
      y += 3;
    }
  }

  return pdf;
}
