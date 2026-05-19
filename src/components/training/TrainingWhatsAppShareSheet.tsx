import { Copy, MessageCircleMore, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { buildTrainingWhatsAppShareUrl } from '../../lib/trainingShareDomain';

export default function TrainingWhatsAppShareSheet({
  open,
  initialText,
  onClose,
}: {
  open: boolean;
  initialText: string;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  if (!open) {
    return null;
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
  };

  const handleOpenWhatsApp = () => {
    window.open(buildTrainingWhatsAppShareUrl(text), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/38 backdrop-blur-[1px]">
      <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} aria-label="Close share sheet" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-whatsapp-share-title"
        className="absolute inset-x-0 bottom-0 max-h-[calc(100dvh-1rem)] overflow-auto rounded-t-[32px] border border-white/10 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-18px_48px_rgba(15,23,42,0.24)] md:bottom-6 md:left-1/2 md:max-w-xl md:-translate-x-1/2 md:rounded-[32px] md:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">Share plan</p>
            <h2 id="training-whatsapp-share-title" className="mt-2 text-balance text-xl font-black text-[var(--color-dark)] md:text-2xl">WhatsApp message</h2>
            <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)]">
              We generate the operational message from the structured plan. You can still tweak the wording before sending.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close WhatsApp share sheet" className="rounded-2xl border border-[var(--color-mid)]/16 p-2 text-[var(--color-mid)]">
            <X size={18} />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
          className="mt-5 w-full rounded-[24px] border border-emerald-200 bg-emerald-50/65 px-4 py-4 text-sm font-semibold leading-7 text-[var(--color-dark)] outline-none focus:border-emerald-500"
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-black text-[var(--color-dark)]"
          >
            <Copy size={16} />
            Copy text
          </button>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white"
          >
            <MessageCircleMore size={16} />
            Open WhatsApp
          </button>
        </div>
      </section>
    </div>
  );
}
