import type { ReactNode } from 'react';
import { FileText, PenSquare, ScanLine } from 'lucide-react';

function IntakeButton({
  eyebrow,
  title,
  description,
  icon,
  tone,
  onClick,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone: 'manual' | 'pdf' | 'scan';
  onClick: () => void;
}) {
  const toneClasses =
    tone === 'manual'
      ? 'mwos-card-tone-manual text-slate-800'
      : tone === 'pdf'
        ? 'mwos-card-tone-pdf text-[var(--color-primary)]'
        : 'mwos-card-tone-scan text-[var(--color-primary-deep)]';
  const iconTone =
    tone === 'manual'
      ? 'mwos-icon-tone-manual'
      : tone === 'pdf'
        ? 'mwos-icon-tone-pdf'
        : 'mwos-icon-tone-scan';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border p-4 text-left shadow-[0_14px_34px_rgba(49,39,131,0.05)] transition-transform hover:-translate-y-0.5 ${toneClasses}`}
    >
      <div className="mwos-surface-intro">
        <div className={`mwos-surface-intro-icon flex size-11 items-center justify-center rounded-2xl shadow-[0_8px_20px_rgba(15,23,42,0.08)] ${iconTone}`}>
          {icon}
        </div>
        <div className="mwos-surface-intro-copy">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-70">{eyebrow}</p>
          <h3 className="mt-2 text-balance text-base font-black">{title}</h3>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 opacity-80">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function TrainingIntakeLauncher({
  onCreateManual,
  onImportPdf,
  onScanPhoto,
  disabled,
}: {
  onCreateManual: () => void;
  onImportPdf: () => void;
  onScanPhoto: () => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return null;
  }

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <IntakeButton
        eyebrow="Fastest from WhatsApp"
        title="Scan WhatsApp / photo"
        description="Upload a WhatsApp screenshot or plan photo and convert it into editable day cards."
        icon={<ScanLine size={20} />}
        tone="scan"
        onClick={onScanPhoto}
      />
      <IntakeButton
        eyebrow="Build inside MWOS"
        title="Create manually"
        description="Type the coach plan directly, then share the structured message on WhatsApp."
        icon={<PenSquare size={20} />}
        tone="manual"
        onClick={onCreateManual}
      />
      <IntakeButton
        eyebrow="Existing document"
        title="Import PDF"
        description="Use an existing weekly training document and keep the original attached for review."
        icon={<FileText size={20} />}
        tone="pdf"
        onClick={onImportPdf}
      />
    </section>
  );
}
