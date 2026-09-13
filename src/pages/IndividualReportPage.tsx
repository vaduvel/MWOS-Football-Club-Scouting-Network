import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useReportStore } from '../store/report';
import { canCreateScoutingReports, extractHandwrittenReport, fetchReport, saveReport } from '../lib/data';
import { createIndividualReport, recoverIndividualDraft, validateIndividualReport } from '../lib/individualReportDomain';
import PlayerReviewsTab from './tabs/PlayerReviewsTab';
import ConfirmActionModal from '../components/ConfirmActionModal';
import { buildIndividualReportPdf } from '../lib/individualReportPdf';

export default function IndividualReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const { currentReport: report, setCurrentReport, updatePlayer, updateReview, updateReportField } = useReportStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saved, setSaved] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanText, setScanText] = useState('');
  const [scanError, setScanError] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);
  const canEdit = canCreateScoutingReports(user);
  const draftKey = `mwos:individual:v1:${user?.id}:${id || 'new'}`;
  const [readyKey, setReadyKey] = useState('');
  const [baseline, setBaseline] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [draftNotice, setDraftNotice] = useState('');
  const [exporting, setExporting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const dirty = readyKey === draftKey && !!report && JSON.stringify(report) !== baseline;

  useEffect(() => {
    if (loading || readyKey !== draftKey || !canEdit || !report) return;
    try {
      if (dirty) sessionStorage.setItem(draftKey, JSON.stringify(report));
      else sessionStorage.removeItem(draftKey);
    } catch { setDraftNotice('Browser draft recovery is unavailable. Save before leaving.'); }
  }, [report, dirty, draftKey, readyKey, loading, canEdit]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty || scanning || saving) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty, scanning, saving]);
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);
  useEffect(() => { setPdfUrl(''); }, [report]);

  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    void (async () => {
      try {
        const next = id ? await fetchReport(id) : createIndividualReport(user?.name || '');
        if (!active) return;
        if (next.report_type !== 'individual') { navigate(`/report/${id}`, {replace:true}); return; }
        setBaseline(JSON.stringify(next));
        let restored = next;
        try {
          const raw = canEdit ? sessionStorage.getItem(draftKey) : null;
          if (raw) {
            const draft = recoverIndividualDraft(raw, next, !id);
            if (draft) {
              restored = draft;
              setDraftNotice('Recovered unsaved changes from this browser session. Save to sync them.');
            }
          }
        } catch { setDraftNotice('Could not recover the browser draft.'); }
        setCurrentReport(restored);
        setReadyKey(draftKey);
      } catch (err) { if (active) setLoadError(err instanceof Error ? err.message : 'Unable to load report.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id, user?.id, setCurrentReport, navigate, draftKey, canEdit]);

  const handleSave = async () => {
    if (!report || !canEdit || saving) return;
    const validation = validateIndividualReport(report);
    if (validation) { setError(validation); requestAnimationFrame(() => errorRef.current?.focus()); return; }
    setSaving(true); setError(''); setSaved(false);
    try {
      const savedId = await saveReport(report);
      setBaseline(JSON.stringify(report));
      try { sessionStorage.removeItem(draftKey); } catch { /* Saving to the server succeeded. */ }
      setDraftNotice('');
      setSaved(true);
      if (!id) navigate(`/scouting/individual/${savedId}`, {replace:true});
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save. Your entries are still in this form.'); }
    finally { setSaving(false); }
  };
  const handleScan = async () => {
    if (!file || !canEdit) return;
    setScanning(true); setScanError('');
    try { const result = await extractHandwrittenReport(file); setScanText(result.text); }
    catch (err) { setScanError(err instanceof Error ? err.message : 'Unable to read this image.'); }
    finally { setScanning(false); }
  };

  if (loading) return <main className="p-6" role="status">Loading individual report…</main>;
  if (loadError || !report || report.report_type !== 'individual') return <main className="p-6"><p role="alert">{loadError || 'Report unavailable.'}</p><Link to="/scouting">Back to scouting</Link></main>;
  const player = report.players[0];
  const review = report.reviews[0];
  if (!player || !review) return <main className="p-6"><p role="alert">This report is missing its player or evaluation.</p><Link to="/scouting">Back to scouting</Link></main>;

  return <main className="min-h-dvh bg-[var(--color-light)] p-3 pb-12 md:p-6">
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="rounded-2xl bg-white p-4 md:p-6">
        <Link to="/scouting" onClick={event => { if (dirty || saving || scanning) { event.preventDefault(); setLeaveOpen(true); } }} className="mwos-btn-secondary min-h-11">Back to scouting</Link>
        <h1 className="mt-4 text-balance text-2xl font-black text-[var(--color-dark)]">Individual Player Report</h1>
        <p className="mt-2 text-pretty text-sm">Add an external player, complete the evaluation and save. No match setup is required.</p>
      </header>
      {draftNotice && <p role="status" className="rounded-2xl bg-white p-4">{draftNotice}</p>}
      {dirty && <p role="status">Unsaved changes — save to sync this report.</p>}
      <fieldset disabled={!canEdit || saving} className="space-y-4" onChange={() => setSaved(false)} onClickCapture={() => setSaved(false)}>
        <section className="grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-2">
          <label className="block"><span className="mwos-form-label">Player name *</span><input required aria-invalid={!!error && !player.name.trim()} aria-describedby={error ? 'individual-save-error' : undefined} className="mwos-mobile-input" value={player.name} onChange={e => updatePlayer(player.id,{name:e.target.value})} /></label>
          <label className="block"><span className="mwos-form-label">Player's club (optional)</span><input className="mwos-mobile-input" value={report.home_team} onChange={e => updateReportField('home_team',e.target.value)} /></label>
          <label className="block"><span className="mwos-form-label">Observation date</span><input type="date" className="mwos-mobile-input" value={report.date} onChange={e => updateReportField('date',e.target.value)} /></label>
          <label className="block"><span className="mwos-form-label">Observation location (optional)</span><input className="mwos-mobile-input" value={report.venue} onChange={e => updateReportField('venue',e.target.value)} /></label>
        </section>
        {canEdit && <details className="rounded-2xl bg-white p-4">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold">Scan a handwritten player sheet (optional)</summary>
          <label className="block"><span className="mwos-form-label">Report photo</span><input type="file" accept="image/*" disabled={scanning} onChange={e => {setFile(e.target.files?.[0] || null);setScanText('');setScanError('');}} /></label>
          <button type="button" disabled={!file || scanning} onClick={() => void handleScan()} className="mwos-btn-secondary mt-3 min-h-11">{scanning ? 'Reading photo…' : 'Read photo'}</button>
          {scanError && <p role="alert" className="mt-3 text-red-800">{scanError}</p>}
          {scanText && <div className="mt-4 space-y-3"><label className="block"><span className="mwos-form-label">Check the extracted text before applying</span><textarea className="mwos-mobile-textarea" rows={8} value={scanText} onChange={e => setScanText(e.target.value)} /></label><button type="button" className="mwos-btn-secondary min-h-11" onClick={() => {updateReview(review.id,{overview:[review.overview,scanText].filter(Boolean).join('\n\n')});setScanText('');}}>Add text to player overview</button></div>}
        </details>}
        <PlayerReviewsTab canEdit={canEdit} individual />
      </fieldset>
      <div id="individual-save-error" ref={errorRef} tabIndex={-1} role="alert" className={error ? 'rounded-2xl bg-red-50 p-4 text-red-800' : ''}>{error}</div>
      {saved && <p role="status" className="rounded-2xl bg-white p-4">Report saved.</p>}
      {canEdit && <button type="button" disabled={saving || scanning} onClick={() => void handleSave()} className="mwos-btn-primary min-h-12 w-full">{saving ? 'Saving…' : 'Save individual report'}</button>}
      {!canEdit && <p>Read-only report.</p>}
      <section className="space-y-3 rounded-2xl bg-white p-4">
        <h2 className="text-lg font-bold">Export individual report</h2>
        <p className="text-sm">Includes the current player details, notes, verdict and all eight evaluation scores.</p>
        <button type="button" disabled={exporting || saving || scanning} className="mwos-btn-secondary min-h-12 w-full" onClick={async () => {
          setExporting(true); setError('');
          try {
            const pdf = await buildIndividualReportPdf(report);
            setPdfUrl(URL.createObjectURL(pdf.output('blob')));
            pdf.save(`Individual_${player.name.replace(/[^a-z0-9_-]/gi, '_') || 'Player'}.pdf`);
          } catch { setError('Unable to generate PDF. Your report data has not changed.'); }
          finally { setExporting(false); }
        }}>{exporting ? 'Generating PDF…' : 'Download individual PDF'}</button>
        {pdfUrl && <a className="mwos-btn-secondary min-h-11" href={pdfUrl} target="_blank" rel="noreferrer">Open generated PDF</a>}
      </section>
      <ConfirmActionModal open={leaveOpen} tone="warning" cancelLabel="Stay and edit" title="Leave with unsaved changes?" description="Your changes have not been saved to the workspace. Stay and save, or leave and recover the draft in this browser session." confirmLabel="Leave with draft" onCancel={() => setLeaveOpen(false)} onConfirm={() => navigate('/scouting')} loading={saving || scanning} />
    </div>
  </main>;
}
