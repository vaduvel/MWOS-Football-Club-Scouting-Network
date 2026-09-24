import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useReportStore } from '../store/report';
import { canCreateScoutingReports, extractHandwrittenReport, fetchReport, saveReport, type OcrReportResult } from '../lib/data';
import { createIndividualReport, recoverIndividualDraft, validateIndividualReport } from '../lib/individualReportDomain';
import PlayerReviewsTab from './tabs/PlayerReviewsTab';
import ConfirmActionModal from '../components/ConfirmActionModal';
import { buildIndividualReportPdf } from '../lib/individualReportPdf';
import TipsEvaluationSection from '../components/scouting/TipsEvaluationSection';
import { INDIVIDUAL_OCR_FIELDS, INDIVIDUAL_OCR_SCORE_KEYS, parseIndividualOcrText, type IndividualOcrFieldKey, type IndividualOcrFields } from '../lib/individualOcrDomain';
import { applyTipsOcrFields, parseTipsOcrText, TIPS_OCR_FIELDS, TIPS_OCR_DETAILS, type TipsOcrFields, type TipsOcrKey } from '../lib/tipsOcrDomain';
import { createEmptyTipsEvaluation, usesLegacyIndividualReview, type TipsAttributeKey } from '../lib/tipsEvaluationDomain';

const PLAYER_NAME_REQUIRED_ERROR = 'Enter the player name before saving.';
const TIPS_SCORE_KEYS = Object.keys(createEmptyTipsEvaluation().attributes) as TipsAttributeKey[];

export default function IndividualReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const { currentReport: report, setCurrentReport, updatePlayer, updateReview, updateReportField, mergeReportFields } = useReportStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saved, setSaved] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanText, setScanText] = useState('');
  const [scanFields, setScanFields] = useState<IndividualOcrFields>({});
  const [selectedScanFields, setSelectedScanFields] = useState<IndividualOcrFieldKey[]>([]);
  const [tipsScanFields, setTipsScanFields] = useState<TipsOcrFields>({});
  const [selectedTipsScanFields, setSelectedTipsScanFields] = useState<TipsOcrKey[]>([]);
  const [tipsScanRecognized, setTipsScanRecognized] = useState(false);
  const [tipsLayoutRecognized, setTipsLayoutRecognized] = useState(false);
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const [scanApplied, setScanApplied] = useState(false);
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
    if (!file) { setPhotoPreviewUrl(''); return; }
    const url = URL.createObjectURL(file);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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
    try {
      const result = await extractHandwrittenReport(file, 'tips-2027');
      updateScanText(result.text, result.tipsLayout);
      if (!result.text.trim() && !result.tipsLayout?.recognized) setScanError('No writing was detected. Try a clearer photo or enter the player details manually.');
    }
    catch (err) { setScanError(err instanceof Error ? err.message : 'Unable to read this image.'); }
    finally { setScanning(false); }
  };
  const updateScanText = (text: string, layout?: OcrReportResult['tipsLayout']) => {
    const parsed = parseIndividualOcrText(text);
    const tipsParsed = parseTipsOcrText(text);
    const layoutRecognized = layout?.recognized === true;
    const allowedTips = new Set<TipsOcrKey>(TIPS_OCR_FIELDS.map(([key]) => key));
    const layoutTips = Object.fromEntries(Object.entries(layout?.fields || {}).filter(([key]) => allowedTips.has(key as TipsOcrKey))) as TipsOcrFields;
    const playerDetailKeys: IndividualOcrFieldKey[] = ['player_name', 'club', 'position', 'date', 'venue'];
    const layoutPlayer = Object.fromEntries(Object.entries(layout?.playerFields || {}).filter(([key]) => playerDetailKeys.includes(key as IndividualOcrFieldKey))) as IndividualOcrFields;
    const playerFields = layoutRecognized ? layoutPlayer : parsed.fields;
    const tipsFields = layoutRecognized ? layoutTips : tipsParsed.fields;
    setScanText(text);
    setScanFields(playerFields);
    setSelectedScanFields((Object.keys(playerFields) as IndividualOcrFieldKey[]).filter(key => (!layoutRecognized && !tipsParsed.recognized) || playerDetailKeys.includes(key)));
    setTipsScanFields(tipsFields);
    setSelectedTipsScanFields(Object.keys(tipsFields) as TipsOcrKey[]);
    setTipsScanRecognized(layoutRecognized || tipsParsed.recognized);
    setTipsLayoutRecognized(layoutRecognized);
    setScanWarnings(layoutRecognized ? layout?.warnings || [] : [
      ...(layout ? ['The TIPS page could not be aligned confidently. Check every text-based suggestion against the photo.'] : []),
      ...parsed.warnings, ...tipsParsed.warnings,
    ]);
    setScanApplied(false);
  };
  const applyTipsScanFields = () => {
    if (!report || !canEdit) return;
    try {
      const next = applyTipsOcrFields(report.tips_evaluation || createEmptyTipsEvaluation(), tipsScanFields, selectedTipsScanFields);
      if (selectedScanFields.includes('date') && !/^\d{4}-\d{2}-\d{2}$/.test(scanFields.date || '')) throw new Error('Review the detected date before applying. Use YYYY-MM-DD.');
      const updates: Partial<typeof report> = { tips_evaluation: next };
      const player = report.players[0];
      if (player) {
        const playerChanges: Partial<typeof player> = {};
        if (selectedScanFields.includes('player_name') && scanFields.player_name?.trim()) playerChanges.name = scanFields.player_name.trim();
        if (selectedScanFields.includes('position') && scanFields.position?.trim()) playerChanges.position = scanFields.position.trim();
        if (Object.keys(playerChanges).length) updates.players = report.players.map(current => current.id === player.id ? { ...current, ...playerChanges } : current);
      }
      if (selectedScanFields.includes('club') && scanFields.club?.trim()) updates.home_team = scanFields.club.trim();
      if (selectedScanFields.includes('date') && scanFields.date) updates.date = scanFields.date;
      if (selectedScanFields.includes('venue') && scanFields.venue?.trim()) updates.venue = scanFields.venue.trim();
      mergeReportFields(updates);
      setScanError('');
      setScanApplied(true);
      setSaved(false);
    } catch (err) { setScanError(err instanceof Error ? err.message : 'Review TIPS scores before applying.'); }
  };
  const applyScanFields = () => {
    if (!report || !canEdit) return;
    const selected = new Set(selectedScanFields);
    const player = report.players[0];
    const review = report.reviews[0];
    if (!player || !review) return;
    const invalidScore = INDIVIDUAL_OCR_SCORE_KEYS.find(key => selectedScanFields.includes(key) && (!Number.isInteger(Number(scanFields[key])) || Number(scanFields[key]) < 1 || Number(scanFields[key]) > 5));
    if (invalidScore) { setScanError('Review detected scores before applying. Current evaluation scores must be whole numbers from 1 to 5.'); return; }
    if (selectedScanFields.includes('date') && !/^\d{4}-\d{2}-\d{2}$/.test(scanFields.date || '')) { setScanError('Review the detected date before applying. Use YYYY-MM-DD.'); return; }
    if (selectedScanFields.includes('potential') && !['Academy', 'Semi-pro', 'Pro', 'Elite'].includes(scanFields.potential || '')) { setScanError('Review the detected potential level before applying.'); return; }
    setScanError('');
    const playerChanges: Partial<typeof player> = {};
    if (selected.has('player_name') && scanFields.player_name?.trim()) playerChanges.name = scanFields.player_name.trim();
    if (selected.has('position') && scanFields.position?.trim()) playerChanges.position = scanFields.position.trim();
    if (Object.keys(playerChanges).length) updatePlayer(player.id, playerChanges);
    if (selected.has('club') && scanFields.club?.trim()) updateReportField('home_team', scanFields.club.trim());
    if (selected.has('date') && /^\d{4}-\d{2}-\d{2}$/.test(scanFields.date || '')) updateReportField('date', scanFields.date!);
    if (selected.has('venue') && scanFields.venue?.trim()) updateReportField('venue', scanFields.venue.trim());
    const reviewChanges: Partial<typeof review> = {};
    for (const [source, target] of [
      ['overview', 'overview'], ['strengths', 'strengths'], ['areas_to_improve', 'areas_to_improve'],
      ['verdict', 'recommendation_verdict'], ['potential', 'potential_level'],
    ] as const) if (selected.has(source) && scanFields[source]?.trim()) reviewChanges[target] = scanFields[source]!.trim();
    for (const key of INDIVIDUAL_OCR_SCORE_KEYS) {
      if (!selected.has(key)) continue;
      const score = Number(scanFields[key]);
      if (Number.isInteger(score) && score >= 1 && score <= 5) reviewChanges[key as keyof typeof reviewChanges] = score as never;
    }
    if (Object.keys(reviewChanges).length) {
      updateReview(review.id, reviewChanges);
      updateReportField('tips_evaluation', { ...(report.tips_evaluation || createEmptyTipsEvaluation()), legacyReviewEnabled: true });
    }
    setScanApplied(true);
    setSaved(false);
  };

  if (loading) return <main className="p-6" role="status">Loading individual report…</main>;
  if (loadError || !report || report.report_type !== 'individual') return <main className="p-6"><p role="alert">{loadError || 'Report unavailable.'}</p><Link to="/scouting">Back to scouting</Link></main>;
  const player = report.players[0];
  const review = report.reviews[0];
  if (!player || !review) return <main className="p-6"><p role="alert">This report is missing its player or evaluation.</p><Link to="/scouting">Back to scouting</Link></main>;
  const detectedScores = TIPS_SCORE_KEYS.filter(key => tipsScanFields[key] !== undefined).length;
  const detectedNotes = TIPS_SCORE_KEYS.filter(key => tipsScanFields[`${key}_notes`] !== undefined).length;

  return <main className="min-h-dvh bg-[var(--color-light)] p-3 pb-12 md:p-6">
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="mwos-tips-hero mwos-tips-hero-page rounded-2xl p-4 text-white md:p-6">
        <Link to="/scouting" onClick={event => { if (dirty || saving || scanning) { event.preventDefault(); setLeaveOpen(true); } }} className="mwos-btn-secondary inline-flex min-h-11 items-center rounded-lg px-3 py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Back to scouting</Link>
        <h1 className="mt-4 text-balance text-2xl font-black text-white">TIPS Player Report</h1>
        <p className="mt-2 max-w-md text-pretty text-sm text-white/95">Add an external player, complete the TIPS evaluation and save. The previous 1–5 form is available below if needed; no match setup is required.</p>
      </header>
      {draftNotice && <p role="status" className="rounded-2xl bg-white p-4">{draftNotice}</p>}
      {dirty && <p role="status">Unsaved changes — save to sync this report.</p>}
      <fieldset disabled={!canEdit || saving} className="space-y-4" onChange={() => setSaved(false)} onClickCapture={() => setSaved(false)}>
        <section className="grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-2">
          <label className="block"><span className="mwos-form-label">Player name *</span><input required aria-invalid={error === PLAYER_NAME_REQUIRED_ERROR} aria-describedby={error === PLAYER_NAME_REQUIRED_ERROR ? 'individual-save-error' : undefined} className="mwos-mobile-input" value={player.name} onChange={e => { updatePlayer(player.id,{name:e.target.value}); if (e.target.value.trim()) setError(current => current === PLAYER_NAME_REQUIRED_ERROR ? '' : current); }} /></label>
          <label className="block"><span className="mwos-form-label">Player's club (optional)</span><input className="mwos-mobile-input" value={report.home_team} onChange={e => updateReportField('home_team',e.target.value)} /></label>
          <label className="block"><span className="mwos-form-label">Position(s) (optional)</span><input className="mwos-mobile-input" value={player.position || ''} onChange={e => updatePlayer(player.id,{position:e.target.value})} /></label>
          <label className="block"><span className="mwos-form-label">Observation date</span><input type="date" className="mwos-mobile-input" value={report.date} onChange={e => updateReportField('date',e.target.value)} /></label>
          <label className="block"><span className="mwos-form-label">Observation location (optional)</span><input className="mwos-mobile-input" value={report.venue} onChange={e => updateReportField('venue',e.target.value)} /></label>
        </section>
        {canEdit && <details className="rounded-2xl bg-white p-4">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold">Scan the printed TIPS sheet (optional)</summary>
          <p className="mb-3 text-sm">Photograph the full, flat 2027 TIPS sheet in good light, or upload a one-page PDF scan. The app reads handwriting from its known boxes, then lets you correct every suggested value before applying it. The image is sent to the OCR service but is not stored with this report. The overall decision and signature need your own review.</p>
          <label className="block"><span className="mwos-form-label">TIPS sheet photo or PDF scan</span><input type="file" accept="image/*,application/pdf" disabled={scanning} onChange={e => {setFile(e.target.files?.[0] || null);updateScanText('');setScanError('');}} /></label>
          {photoPreviewUrl && <div className="mt-3 rounded-xl border border-[var(--color-primary-border)] p-2"><p className="mb-2 text-xs font-bold uppercase text-[var(--color-mid)]">Original sheet for checking OCR values</p>{file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '') ? <a className="mwos-btn-secondary inline-flex min-h-11 items-center" href={photoPreviewUrl} target="_blank" rel="noreferrer">Open selected PDF scan</a> : <img src={photoPreviewUrl} alt="Selected TIPS sheet" className="max-h-[28rem] w-full object-contain" />}</div>}
          <button type="button" disabled={!file || scanning} onClick={() => void handleScan()} className="mwos-btn-secondary mt-3 min-h-11">{scanning ? 'Reading sheet…' : 'Read TIPS sheet'}</button>
          {scanError && <p role="alert" className="mt-3 text-red-800">{scanError}</p>}
          {(scanText || tipsScanRecognized) && <div className="mt-4 space-y-4">
            <label className="block"><span className="mwos-form-label">{tipsLayoutRecognized ? 'OCR transcription (reference)' : 'Extracted text (editable)'}</span><textarea className="mwos-mobile-textarea" rows={8} value={scanText} readOnly={tipsLayoutRecognized} onChange={e => updateScanText(e.target.value)} /></label>
            {scanWarnings.map((warning, index) => <p key={`${index}-${warning}`} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{warning}</p>)}
            <div className="rounded-xl border border-[var(--color-mid)]/20 p-3">
              <h3 className="font-bold">Review detected fields</h3>
              <p className="mb-3 text-sm">Selected values will replace their corresponding fields in this form. Nothing is saved until you press Save individual report.</p>
              {tipsScanRecognized && <div className="mb-4 space-y-3">
                <h4 className="font-bold">TIPS proposals · main 1–10 evaluation</h4>
                <p className="text-sm">{tipsLayoutRecognized ? 'Values were associated with boxes on the 2027 sheet.' : 'Only text-based matches were found; check the alignment carefully.'} Check scores and notes against the photo. Missing boxes remain blank; choose the overall decision yourself.</p>
                <p role="status" className="text-sm font-semibold">Detected {detectedScores} of 30 scores and {detectedNotes} of 30 attribute notes.</p>
                {Object.keys(tipsScanFields).length === 0 ? <p role="status" className="text-sm">No TIPS values were confidently matched. Enter them manually below.</p> : <>
                  {TIPS_OCR_FIELDS.filter(([key]) => tipsScanFields[key] !== undefined).map(([key, label]) => <div key={key} className="grid gap-2 rounded-xl bg-[var(--color-light)] p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
                    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={selectedTipsScanFields.includes(key)} onChange={event => setSelectedTipsScanFields(current => event.target.checked ? [...current, key] : current.filter(item => item !== key))} />Apply {label}</label>
                    <input aria-label={`OCR TIPS ${label}`} className="mwos-mobile-input" type={TIPS_OCR_DETAILS.some(([detailKey]) => detailKey === key) || key.endsWith('_notes') ? 'text' : 'number'} min={TIPS_OCR_DETAILS.some(([detailKey]) => detailKey === key) || key.endsWith('_notes') ? undefined : 1} max={TIPS_OCR_DETAILS.some(([detailKey]) => detailKey === key) || key.endsWith('_notes') ? undefined : 10} value={tipsScanFields[key] || ''} onChange={event => setTipsScanFields(current => ({ ...current, [key]: event.target.value }))} />
                  </div>)}
                </>}
              </div>}
              <h4 className="border-t border-[var(--color-mid)]/20 pt-4 font-bold">{tipsScanRecognized ? 'Player identity from the TIPS sheet' : 'Player details and previous 1–5 fields'}</h4>
              {Object.keys(scanFields).length === 0 ? <p role="status" className="text-sm">No player identity was confidently matched. Enter the name and club manually below.</p> : <div className="space-y-3">
                {INDIVIDUAL_OCR_FIELDS.filter(([key]) => scanFields[key] !== undefined).map(([key, label]) => <div key={key} className="grid gap-2 rounded-xl bg-[var(--color-light)] p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
                  <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={selectedScanFields.includes(key)} onChange={event => setSelectedScanFields(current => event.target.checked ? [...current, key] : current.filter(item => item !== key))} />Apply {label}</label>
                  <input aria-label={`OCR ${label}`} className="mwos-mobile-input" type={key === 'date' ? 'date' : INDIVIDUAL_OCR_SCORE_KEYS.includes(key) ? 'number' : 'text'} min={INDIVIDUAL_OCR_SCORE_KEYS.includes(key) ? 1 : undefined} max={INDIVIDUAL_OCR_SCORE_KEYS.includes(key) ? 5 : undefined} value={scanFields[key] || ''} onChange={event => setScanFields(current => ({ ...current, [key]: event.target.value }))} />
                </div>)}
                {!tipsScanRecognized && <button type="button" className="mwos-btn-secondary min-h-11" disabled={!selectedScanFields.length} onClick={applyScanFields}>Apply selected fields to form</button>}
              </div>}
              {tipsScanRecognized && <button type="button" className="mwos-btn-primary mt-4 min-h-11 w-full" disabled={!selectedTipsScanFields.length && !selectedScanFields.length} onClick={applyTipsScanFields}>Apply reviewed TIPS scan to form</button>}
            </div>
            {scanApplied && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm">Fields copied into the form. Check them, then save the report.</p>}
            {!tipsLayoutRecognized && <button type="button" className="mwos-btn-secondary min-h-11" onClick={() => {const tips = report.tips_evaluation || createEmptyTipsEvaluation(); updateReportField('tips_evaluation', {...tips, otherNotes:[tips.otherNotes, scanText].filter(Boolean).join('\n\n')});setScanApplied(true);}}>Append full transcription to TIPS notes</button>}
          </div>}
        </details>}
        <TipsEvaluationSection value={report.tips_evaluation} disabled={!canEdit || saving} onChange={next => updateReportField('tips_evaluation', next)} />
        <details className="rounded-2xl bg-white p-4 md:p-6">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold">Previous 1–5 evaluation (optional)</summary>
          <p className="mb-4 text-sm">This is the older scouting method. Its scores are not converted from TIPS or counted unless you choose to use it. If you activate it, review all eight starting values of 3/5 before saving.</p>
          {usesLegacyIndividualReview(report.tips_evaluation)
            ? <PlayerReviewsTab canEdit={canEdit} individual />
            : <button type="button" disabled={!canEdit || saving} className="mwos-btn-secondary min-h-11" onClick={() => updateReportField('tips_evaluation', { ...(report.tips_evaluation || createEmptyTipsEvaluation()), legacyReviewEnabled: true })}>Use previous 1–5 evaluation</button>}
        </details>
      </fieldset>
      <div id="individual-save-error" ref={errorRef} tabIndex={-1} role="alert" className={error ? 'rounded-2xl bg-red-50 p-4 text-red-800' : ''}>{error}</div>
      {saved && <p role="status" className="rounded-2xl bg-white p-4">Report saved.</p>}
      {canEdit && <button type="button" disabled={saving || scanning} onClick={() => void handleSave()} className="mwos-btn-primary min-h-12 w-full">{saving ? 'Saving…' : 'Save individual report'}</button>}
      {!canEdit && <p>Read-only report.</p>}
      <section className="space-y-3 rounded-2xl bg-white p-4">
        <h2 className="text-lg font-bold">Export individual report</h2>
        <p className="text-sm">Exports the TIPS evaluation first. The previous 1–5 review is included separately only when used; historical reports remain unchanged.</p>
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
