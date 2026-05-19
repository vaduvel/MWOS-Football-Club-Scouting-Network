import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileText, Loader2, Sparkles, Trash2, Upload, Video } from 'lucide-react';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import {
  ALLOWED_REPORT_VIDEO_TYPES,
  deleteReportVideo,
  extractHandwrittenReport,
  MAX_REPORT_VIDEO_BYTES,
  MAX_REPORT_VIDEO_DURATION_SECONDS,
  uploadReportVideo,
  type OcrReportResult,
} from '../../lib/data';
import { useReportStore } from '../../store/report';

type SectionKey = 'ocr' | 'details' | 'teams' | 'notes' | 'video';

export default function MatchReportTab() {
  const { currentReport, mergeReportFields, updateReportField } = useReportStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrReportResult | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    ocr: true,
    details: true,
    teams: true,
    notes: true,
    video: true,
  });
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [videoDeleting, setVideoDeleting] = useState(false);
  const [videoDeleteConfirmOpen, setVideoDeleteConfirmOpen] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncCompactMode = () => {
      const compact = window.innerWidth < 768;
      setIsCompact(compact);
      if (!compact) {
        setOpenSections({
          ocr: true,
          details: true,
          teams: true,
          notes: true,
          video: true,
        });
      }
    };

    syncCompactMode();
    window.addEventListener('resize', syncCompactMode);
    return () => window.removeEventListener('resize', syncCompactMode);
  }, []);

  if (!currentReport) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateReportField(e.target.name as keyof typeof currentReport, e.target.value);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setSelectedFile(nextFile);
    setOcrResult(null);
    setOcrError('');
  };

  const handleRunOcr = async () => {
    if (!selectedFile) return;

    setOcrLoading(true);
    setOcrError('');

    try {
      const result = await extractHandwrittenReport(selectedFile);
      setOcrResult(result);
    } catch (error: any) {
      setOcrError(error.message);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleApplyDetectedFields = () => {
    if (!ocrResult) return;

    mergeReportFields(ocrResult.suggestions);
  };

  const handleAppendOcrToNotes = () => {
    if (!ocrResult?.text) return;

    const prefix = `[OCR Import: ${ocrResult.fileName}]`;
    const nextNotes = currentReport.general_notes
      ? `${currentReport.general_notes}\n\n${prefix}\n${ocrResult.text}`
      : `${prefix}\n${ocrResult.text}`;

    updateReportField('general_notes', nextNotes);
  };

  const detectedFields = Object.entries(ocrResult?.suggestions || {});
  const toggleSection = (section: SectionKey) => {
    if (!isCompact) return;
    setOpenSections((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentReport?.id) return;

    setVideoUploading(true);
    setVideoError('');
    try {
      const url = await uploadReportVideo(currentReport.id, file);
      updateReportField('video_url', url);
    } catch (err: any) {
      setVideoError(err.message || 'Upload failed.');
    } finally {
      setVideoUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleVideoDelete = async () => {
    if (!currentReport?.id || !currentReport.video_url) return;

    setVideoDeleting(true);
    setVideoError('');
    try {
      await deleteReportVideo(currentReport.id, currentReport.video_url);
      updateReportField('video_url', undefined);
      setVideoDeleteConfirmOpen(false);
    } catch (err: any) {
      setVideoError(err.message || 'Delete failed.');
    } finally {
      setVideoDeleting(false);
    }
  };

  const sectionSurface = 'bg-white rounded-2xl shadow-sm border border-[var(--color-mid)]/20';
  const sectionPadding = isCompact ? 'p-4' : 'p-6 md:p-8';

  return (
    <>
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 md:space-y-8">
      <section className={`${sectionSurface} ${sectionPadding}`}>
        <button
          type="button"
          onClick={() => toggleSection('ocr')}
          className={`flex w-full items-start justify-between gap-4 ${isCompact ? '' : 'cursor-default'}`}
        >
          <div className="text-left">
            <h2 className="text-xl font-black uppercase tracking-tighter text-[var(--color-dark)] md:text-2xl">Handwritten Import</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-[var(--color-mid)]">
              Upload a report photo to pull notes and match details into this draft.
            </p>
          </div>
          {isCompact ? (
            <ChevronDown
              size={20}
              className={`mt-1 flex-shrink-0 text-[var(--color-mid)] transition-transform ${openSections.ocr ? 'rotate-180' : ''}`}
            />
          ) : null}
        </button>

        {(!isCompact || openSections.ocr) && (
          <div className="mt-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="lg:w-[360px] w-full space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-mid)]">Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm font-semibold text-[var(--color-dark)] file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-opacity-90"
                  />
                </label>

                <div className="rounded-xl border border-[var(--color-mid)]/20 bg-[var(--color-light)] p-4 text-sm font-semibold text-[var(--color-mid)]">
                  {selectedFile ? (
                    <p>Selected: <span className="text-[var(--color-dark)]">{selectedFile.name}</span></p>
                  ) : (
                    <p>Use a clear image of the handwritten report.</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handleRunOcr()}
                  disabled={!selectedFile || ocrLoading}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-[var(--color-primary)] py-3 font-bold text-white shadow-md transition-all hover:bg-opacity-90 disabled:opacity-50"
                >
                  {ocrLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Reading report...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      <span>Read Report</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 space-y-4">
                {ocrError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {ocrError}
                  </div>
                )}

                {ocrResult ? (
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <h3 className="text-lg font-black uppercase tracking-wider text-[var(--color-dark)]">Extracted Text</h3>
                          <p className="text-sm font-semibold text-[var(--color-mid)]">
                            {ocrResult.fileName} • {ocrResult.lineCount} detected lines
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAppendOcrToNotes}
                          className="rounded-lg bg-[var(--color-dark)] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-opacity-90"
                        >
                          Append to Notes
                        </button>
                      </div>

                      <textarea
                        readOnly
                        value={ocrResult.text}
                        rows={isCompact ? 10 : 14}
                        className="w-full resize-y rounded-xl border border-[var(--color-mid)]/30 bg-[var(--color-light)]/50 p-4 text-sm font-medium text-[var(--color-dark)]"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <h3 className="text-lg font-black uppercase tracking-wider text-[var(--color-dark)]">Detected Fields</h3>
                          <p className="text-sm font-semibold text-[var(--color-mid)]">
                            Review and apply the suggested match details.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyDetectedFields}
                          disabled={detectedFields.length === 0}
                          className="flex items-center space-x-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-opacity-90 disabled:opacity-50"
                        >
                          <Sparkles size={16} />
                          <span>Apply Suggestions</span>
                        </button>
                      </div>

                      <div className="space-y-3 rounded-2xl border border-[var(--color-mid)]/20 bg-[var(--color-light)]/40 p-4">
                        {detectedFields.length === 0 ? (
                          <div className="flex items-start space-x-3 text-sm font-semibold text-[var(--color-mid)]">
                            <FileText size={18} className="mt-0.5 flex-shrink-0" />
                            <p>No match fields were found yet. You can still add the extracted text into notes.</p>
                          </div>
                        ) : (
                          detectedFields.map(([key, value]) => (
                            <div key={key} className="rounded-xl border border-[var(--color-mid)]/20 bg-white px-4 py-3">
                              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-mid)]">{key.replace(/_/g, ' ')}</p>
                              <p className="mt-1 font-semibold text-[var(--color-dark)]">{String(value)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className={`${sectionSurface} ${sectionPadding}`}>
        <button
          type="button"
          onClick={() => toggleSection('details')}
          className={`flex w-full items-start justify-between gap-4 ${isCompact ? '' : 'cursor-default'}`}
        >
          <div className="text-left">
            <h2 className="text-xl font-black uppercase tracking-tighter text-[var(--color-dark)] md:text-2xl">Match Details</h2>
            {isCompact ? <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">Competition, date, venue and conditions.</p> : null}
          </div>
          {isCompact ? (
            <ChevronDown
              size={20}
              className={`mt-1 flex-shrink-0 text-[var(--color-mid)] transition-transform ${openSections.details ? 'rotate-180' : ''}`}
            />
          ) : null}
        </button>
        
        {(!isCompact || openSections.details) && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Competition</label>
            <input name="competition" value={currentReport.competition} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold" placeholder="e.g. Premier League" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Date</label>
            <input type="date" name="date" value={currentReport.date} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Venue</label>
            <input name="venue" value={currentReport.venue} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold" placeholder="Stadium Name" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Kick-off Time</label>
            <input type="time" name="kickoff" value={currentReport.kickoff} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Weather</label>
            <input name="weather" value={currentReport.weather} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold" placeholder="e.g. Sunny, 18°C" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Pitch Condition</label>
            <input name="pitch" value={currentReport.pitch} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold" placeholder="e.g. Excellent, Wet" />
          </div>
          </div>
        )}
      </section>

      <section className={`${sectionSurface} ${sectionPadding}`}>
        <button
          type="button"
          onClick={() => toggleSection('teams')}
          className={`flex w-full items-start justify-between gap-4 ${isCompact ? '' : 'cursor-default'}`}
        >
          <div className="text-left">
            <h2 className="text-xl font-black uppercase tracking-tighter text-[var(--color-dark)] md:text-2xl">Teams & Score</h2>
            {isCompact ? <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">Team names, scores and managers.</p> : null}
          </div>
          {isCompact ? (
            <ChevronDown
              size={20}
              className={`mt-1 flex-shrink-0 text-[var(--color-mid)] transition-transform ${openSections.teams ? 'rotate-180' : ''}`}
            />
          ) : null}
        </button>
        
        {(!isCompact || openSections.teams) && (
          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="bg-[var(--color-light)] p-4 rounded-xl border border-[var(--color-mid)]/20 md:p-6">
            <h3 className="text-lg font-black text-[var(--color-primary)] mb-4 uppercase tracking-wider text-center">Home Team</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Team Name</label>
                <input name="home_team" value={currentReport.home_team} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-bold text-lg text-center" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Score</label>
                <input type="number" inputMode="numeric" name="home_score" value={currentReport.home_score} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-black text-3xl text-center text-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Manager</label>
                <input name="home_manager" value={currentReport.home_manager} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold text-center" />
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-light)] p-4 rounded-xl border border-[var(--color-mid)]/20 md:p-6">
            <h3 className="text-lg font-black text-[var(--color-accent)] mb-4 uppercase tracking-wider text-center">Away Team</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Team Name</label>
                <input name="away_team" value={currentReport.away_team} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none transition-all font-bold text-lg text-center" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Score</label>
                <input type="number" inputMode="numeric" name="away_score" value={currentReport.away_score} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none transition-all font-black text-3xl text-center text-[var(--color-accent)]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Manager</label>
                <input name="away_manager" value={currentReport.away_manager} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none transition-all font-semibold text-center" />
              </div>
            </div>
          </div>
          </div>
        )}
      </section>

      <section className={`${sectionSurface} ${sectionPadding}`}>
        <button
          type="button"
          onClick={() => toggleSection('notes')}
          className={`flex w-full items-start justify-between gap-4 ${isCompact ? '' : 'cursor-default'}`}
        >
          <div className="text-left">
            <h2 className="text-xl font-black uppercase tracking-tighter text-[var(--color-dark)] md:text-2xl">Notes</h2>
            {isCompact ? <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">Focus points and overall observations.</p> : null}
          </div>
          {isCompact ? (
            <ChevronDown
              size={20}
              className={`mt-1 flex-shrink-0 text-[var(--color-mid)] transition-transform ${openSections.notes ? 'rotate-180' : ''}`}
            />
          ) : null}
        </button>
        
        {(!isCompact || openSections.notes) && (
          <div className="mt-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Focus of the Report</label>
            <textarea name="focus" value={currentReport.focus} onChange={handleChange} rows={3} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold resize-none md:resize-y" placeholder="e.g. Analyzing the opposition's defensive shape..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">General Match Notes</label>
            <textarea name="general_notes" value={currentReport.general_notes} onChange={handleChange} rows={5} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold resize-none md:resize-y" placeholder="Overall impressions of the match..." />
          </div>
          </div>
        )}
      </section>

      <section className={`${sectionSurface} ${sectionPadding}`}>
        <button
          type="button"
          onClick={() => toggleSection('video')}
          className={`flex w-full items-start justify-between gap-4 ${isCompact ? '' : 'cursor-default'}`}
        >
          <div className="text-left">
            <h2 className="text-xl font-black uppercase tracking-tighter text-[var(--color-dark)] md:text-2xl">Match Video</h2>
            <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
              Attach one short clip per report. Keep it under 1 min 30 sec and 30 MB.
            </p>
          </div>
          {isCompact ? (
            <ChevronDown
              size={20}
              className={`mt-1 flex-shrink-0 text-[var(--color-mid)] transition-transform ${openSections.video ? 'rotate-180' : ''}`}
            />
          ) : null}
        </button>

        {(!isCompact || openSections.video) && (
          <div className="mt-6">
            {videoError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {videoError}
              </div>
            )}

            {!currentReport.id ? (
              <div className="rounded-xl border border-dashed border-[var(--color-mid)]/30 bg-[var(--color-light)] px-4 py-6 text-center text-sm font-semibold text-[var(--color-mid)]">
                <Video size={28} className="mx-auto mb-2 opacity-50" />
                Save the report first, then attach a video.
              </div>
            ) : currentReport.video_url ? (
              <div className="space-y-4">
                <video
                  src={currentReport.video_url}
                  controls
                  playsInline
                  className="w-full rounded-2xl border border-[var(--color-mid)]/20 bg-black shadow-sm"
                  style={{ maxHeight: '320px' }}
                />
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold text-[var(--color-mid)]">1 video attached. Remove it before uploading a new clip.</p>
                  <button
                    type="button"
                    onClick={() => setVideoDeleteConfirmOpen(true)}
                    disabled={videoDeleting}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                  >
                    {videoDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    Remove Video
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept={ALLOWED_REPORT_VIDEO_TYPES.join(',')}
                  onChange={(e) => void handleVideoUpload(e)}
                  className="hidden"
                  id="video-upload-input"
                />
                <label
                  htmlFor="video-upload-input"
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors ${
                    videoUploading
                      ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 cursor-default'
                      : 'border-[var(--color-mid)]/30 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/[0.02]'
                  }`}
                >
                  {videoUploading ? (
                    <>
                      <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
                      <p className="text-sm font-bold text-[var(--color-primary)]">Uploading video...</p>
                    </>
                  ) : (
                    <>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        <Upload size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-[var(--color-dark)]">Tap to upload a video</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                          MP4, MOV, WebM · max {(MAX_REPORT_VIDEO_BYTES / 1024 / 1024).toFixed(0)} MB · up to {Math.floor(MAX_REPORT_VIDEO_DURATION_SECONDS / 60)}:{String(MAX_REPORT_VIDEO_DURATION_SECONDS % 60).padStart(2, '0')}
                        </p>
                      </div>
                    </>
                  )}
                </label>
                <p className="mt-3 text-xs font-semibold text-[var(--color-mid)]">
                  Allowed formats: {ALLOWED_REPORT_VIDEO_TYPES.map((type) => type.replace('video/', '').toUpperCase()).join(', ')}. Only one clip is stored for each report.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
      </div>

      <ConfirmActionModal
        open={videoDeleteConfirmOpen}
        title="Remove video?"
        description="This clip will be detached from the report and deleted from storage. The rest of the report stays unchanged."
        confirmLabel="Remove video"
        loading={videoDeleting}
        onCancel={() => setVideoDeleteConfirmOpen(false)}
        onConfirm={() => void handleVideoDelete()}
      />
    </>
  );
}
