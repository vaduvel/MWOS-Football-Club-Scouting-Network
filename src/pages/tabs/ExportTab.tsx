import { useState } from 'react';
import { CheckCircle, Download, FileText } from 'lucide-react';

import { useReportStore } from '../../store/report';

const PAGE_MARGIN = 16;

function displayValue(value: string | number | null | undefined, fallback = 'Not provided') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function safeFilePart(value: string, fallback: string) {
  const normalized = value.trim().replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '');
  return normalized || fallback;
}

export default function ExportTab() {
  const { currentReport } = useReportStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState('');

  if (!currentReport) return null;

  const exportStats = [
    { label: 'Players', value: currentReport.players.length },
    { label: 'Reviews', value: currentReport.reviews.length },
    { label: 'Formations', value: currentReport.players.length > 0 ? 2 : 0 },
    { label: 'Notes', value: currentReport.general_notes.trim() ? 'Ready' : 'Empty' },
  ];

  const generatePDF = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    setExportError('');

    try {
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
        pdf.setFontSize(9.5);
        const lines = pdf.splitTextToSize(value || 'Not provided', contentWidth - labelWidth);
        const nextY = ensureSpace(y, Math.max(7, lines.length * 5 + 2));
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(49, 39, 131);
        pdf.text(label, PAGE_MARGIN, nextY);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(44, 46, 67);
        pdf.text(lines, PAGE_MARGIN + labelWidth, nextY);
        return nextY + Math.max(7, lines.length * 5 + 2);
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
        `${displayValue(currentReport.home_team, 'Home')} vs ${displayValue(currentReport.away_team, 'Away')}  |  ${displayValue(currentReport.date)}`,
        PAGE_MARGIN,
        23,
      );

      let y = 40;
      y = addSectionTitle('Match details', y);
      y = addWrappedText('Competition', displayValue(currentReport.competition), y);
      y = addWrappedText('Venue', displayValue(currentReport.venue), y);
      y = addWrappedText('Kick-off', displayValue(currentReport.kickoff), y);
      y = addWrappedText('Conditions', `${displayValue(currentReport.weather)} / ${displayValue(currentReport.pitch)}`, y);
      y = addWrappedText('Scout', displayValue(currentReport.scout_name), y);

      y = addSectionTitle('Final score', y + 2);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(49, 39, 131);
      pdf.text(
        `${displayValue(currentReport.home_team, 'Home')}  ${displayValue(currentReport.home_score, '-')} - ${displayValue(currentReport.away_score, '-')}  ${displayValue(currentReport.away_team, 'Away')}`,
        pageWidth / 2,
        y + 2,
        { align: 'center' },
      );
      y += 13;
      y = addWrappedText('Home manager', displayValue(currentReport.home_manager), y);
      y = addWrappedText('Away manager', displayValue(currentReport.away_manager), y);

      y = addSectionTitle('Scouting notes', y + 2);
      y = addWrappedText('Focus', displayValue(currentReport.focus), y);
      y = addWrappedText('General notes', displayValue(currentReport.general_notes), y);

      y = addSectionTitle('Team sheets and ratings', y + 2);
      if (currentReport.players.length === 0) {
        y = addWrappedText('Players', 'No players were added to this report.', y);
      } else {
        for (const player of currentReport.players) {
          const teamName = player.team_side === 'home' ? currentReport.home_team : currentReport.away_team;
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

        currentReport.players
          .filter((player) => player.team_side === teamSide)
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

      if (currentReport.players.some((player) => player.team_side === 'home')) {
        drawFormation('home', currentReport.home_team, currentReport.formation_home);
      }
      if (currentReport.players.some((player) => player.team_side === 'away')) {
        drawFormation('away', currentReport.away_team, currentReport.formation_away);
      }

      if (currentReport.reviews.length > 0) {
        addPage();
        y = addSectionTitle('Player reviews', PAGE_MARGIN);
        for (const review of currentReport.reviews) {
          const player = currentReport.players.find((candidate) => String(candidate.id) === String(review.player_id));
          y = ensureSpace(y, 32);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          pdf.setTextColor(49, 39, 131);
          pdf.text(`${displayValue(player?.name, 'Unknown player')} - ${displayValue(review.potential_level, 'Potential not set')}`, PAGE_MARGIN, y);
          y += 7;
          y = addWrappedText('Overview', displayValue(review.overview), y);
          y = addWrappedText('Strengths', displayValue(review.strengths), y);
          y = addWrappedText('Improve', displayValue(review.areas_to_improve), y);
          y = addWrappedText('Verdict', displayValue(review.recommendation_verdict), y);
          y += 3;
        }
      }

      const homeName = safeFilePart(currentReport.home_team, 'Home');
      const awayName = safeFilePart(currentReport.away_team, 'Away');
      pdf.save(`ScoutReport_${homeName}_vs_${awayName}.pdf`);
      setExportSuccess(true);
    } catch (error) {
      console.error('PDF generation failed:', error);
      setExportError('The PDF could not be generated. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 md:space-y-8">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-mid)]/20 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-[var(--color-mid)]/14 p-4 md:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-[var(--color-dark)] md:text-3xl">Export Report</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">
              Build a compact, searchable PDF for coaches, scouts or academy leadership.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 md:gap-4 md:p-6">
          {exportStats.map((item, index) => (
            <div
              key={item.label}
              className={`rounded-2xl border px-3 py-3 ${
                index === 0
                  ? 'border-[var(--color-primary)]/14 bg-[var(--color-primary)]/6'
                  : index === 1
                    ? 'border-[var(--color-accent)]/12 bg-[var(--color-accent)]/5'
                    : 'border-[var(--color-mid)]/14 bg-[var(--color-light)]/55'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">{item.label}</p>
              <p className="mt-2 text-2xl font-black leading-none text-[var(--color-dark)]">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--color-mid)]/14 p-4 md:p-6">
          <div className="rounded-2xl border border-[var(--color-mid)]/20 bg-[var(--color-light)]/60 p-4 text-left md:p-6">
            <h3 className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-[var(--color-dark)]">Included in PDF</h3>
            <ul className="space-y-3">
              {[
                'Match details and notes',
                'Team sheets and ratings',
                'Tactical formations',
                `Player reviews (${currentReport.reviews.length})`,
              ].map((label) => (
                <li key={label} className="flex items-center text-sm font-semibold text-[var(--color-dark)]">
                  <CheckCircle size={16} className="mr-3 text-[var(--color-primary)]" /> {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <button
          onClick={generatePDF}
          disabled={isExporting}
          className="w-full rounded-xl bg-[var(--color-primary)] py-4 text-white shadow-lg transition-all hover:bg-opacity-90 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="inline-flex items-center justify-center gap-3 font-black uppercase tracking-wider">
            <Download size={20} />
            {isExporting ? 'Generating PDF…' : 'Download PDF Report'}
          </span>
        </button>
      </div>

      {exportSuccess ? (
        <div className="mwos-card-tone-training flex items-center justify-center rounded-xl border p-4 text-sm font-bold text-[var(--color-primary-deep)]">
          <CheckCircle size={18} className="mr-2" />
          Compact PDF generated successfully. Check your downloads.
        </div>
      ) : null}

      {exportError ? (
        <div role="alert" className="mwos-card-tone-danger rounded-xl border p-4 text-sm font-bold text-[var(--color-accent-deep)]">
          {exportError}
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+9.85rem)] z-30 px-4 md:hidden">
        <button
          onClick={generatePDF}
          disabled={isExporting}
          className="w-full rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_16px_40px_rgba(49,39,131,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Download size={18} />
            {isExporting ? 'Generating PDF…' : 'Download PDF'}
          </span>
        </button>
      </div>
    </div>
  );
}
