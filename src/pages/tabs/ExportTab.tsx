import { useState } from 'react';
import { CheckCircle, Download, FileText } from 'lucide-react';

import { useReportStore } from '../../store/report';
import { buildMatchReportPdf } from '../../lib/matchReportPdf';
import { countPositionedFormationSides } from '../../lib/reportProgressDomain';

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

  const formationCount = countPositionedFormationSides(currentReport);
  const exportStats = [
    { label: 'Players', value: currentReport.players.length },
    { label: 'Reviews', value: currentReport.reviews.length },
    { label: 'Formations', value: formationCount },
    { label: 'Notes', value: currentReport.general_notes.trim() ? 'Ready' : 'Empty' },
  ];

  const generatePDF = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    setExportError('');

    try {
      const pdf = await buildMatchReportPdf(currentReport);

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
                ...(formationCount > 0 ? [`Tactical formations (${formationCount})`] : []),
                `Player reviews (${currentReport.reviews.length})`,
              ].map((label) => (
                <li key={label} className="flex items-center text-sm font-semibold text-[var(--color-dark)]">
                  <CheckCircle size={16} className="mr-3 text-[var(--color-primary)]" /> {label}
                </li>
              ))}
            </ul>
            {formationCount < 2 && (
              <p className="mt-4 text-sm font-semibold text-[var(--color-mid)]">
                Only teams with players placed on the pitch get a formation diagram in the PDF.
              </p>
            )}
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
