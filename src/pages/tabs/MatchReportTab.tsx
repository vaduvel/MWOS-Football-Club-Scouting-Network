import React, { useState } from 'react';
import { FileText, Loader2, Sparkles, Upload } from 'lucide-react';
import { extractHandwrittenReport, type OcrReportResult } from '../../lib/data';
import { useReportStore } from '../../store/report';

export default function MatchReportTab() {
  const { currentReport, mergeReportFields, updateReportField } = useReportStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrReportResult | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');

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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[var(--color-mid)]/20">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-[var(--color-dark)] uppercase tracking-tighter">Handwritten Import</h2>
            <p className="mt-2 text-sm font-semibold text-[var(--color-mid)] max-w-2xl">
              Upload a photo or scan of a handwritten report. Google Vision OCR will extract the text and suggest match fields you can apply into this draft.
            </p>
          </div>

          <div className="lg:w-[360px] w-full space-y-4">
            <label className="block">
              <span className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Upload Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm font-semibold text-[var(--color-dark)] file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-opacity-90"
              />
            </label>

            <div className="rounded-xl bg-[var(--color-light)] p-4 border border-[var(--color-mid)]/20 text-sm font-semibold text-[var(--color-mid)]">
              {selectedFile ? (
                <p>Selected: <span className="text-[var(--color-dark)]">{selectedFile.name}</span></p>
              ) : (
                <p>Use JPG, PNG or another image format. PDF support is not included yet in this first version.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void handleRunOcr()}
              disabled={!selectedFile || ocrLoading}
              className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-opacity-90 transition-all shadow-md disabled:opacity-50"
            >
              {ocrLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Running OCR...</span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Extract Text with Vision</span>
                </>
              )}
            </button>
          </div>
        </div>

        {ocrError && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {ocrError}
          </div>
        )}

        {ocrResult && (
          <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--color-dark)] uppercase tracking-wider">Extracted Text</h3>
                  <p className="text-sm font-semibold text-[var(--color-mid)]">
                    {ocrResult.fileName} • {ocrResult.lineCount} detected lines
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAppendOcrToNotes}
                  className="bg-[var(--color-dark)] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all"
                >
                  Append to Notes
                </button>
              </div>

              <textarea
                readOnly
                value={ocrResult.text}
                rows={14}
                className="w-full p-4 rounded-xl border border-[var(--color-mid)]/30 bg-[var(--color-light)]/50 font-medium text-sm text-[var(--color-dark)] resize-y"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--color-dark)] uppercase tracking-wider">Detected Fields</h3>
                  <p className="text-sm font-semibold text-[var(--color-mid)]">
                    Review the suggestions before applying them to the form.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApplyDetectedFields}
                  disabled={detectedFields.length === 0}
                  className="bg-[var(--color-accent)] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center space-x-2 hover:bg-opacity-90 transition-all disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  <span>Apply Suggestions</span>
                </button>
              </div>

              <div className="bg-[var(--color-light)]/40 rounded-2xl border border-[var(--color-mid)]/20 p-4 space-y-3">
                {detectedFields.length === 0 ? (
                  <div className="flex items-start space-x-3 text-sm font-semibold text-[var(--color-mid)]">
                    <FileText size={18} className="mt-0.5 flex-shrink-0" />
                    <p>No structured fields were recognized yet. You can still append the extracted text into the notes.</p>
                  </div>
                ) : (
                  detectedFields.map(([key, value]) => (
                    <div key={key} className="rounded-xl bg-white border border-[var(--color-mid)]/20 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-mid)]">{key.replace(/_/g, ' ')}</p>
                      <p className="mt-1 font-semibold text-[var(--color-dark)]">{String(value)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[var(--color-mid)]/20">
        <h2 className="text-2xl font-black text-[var(--color-dark)] mb-6 uppercase tracking-tighter border-b border-[var(--color-mid)]/20 pb-4">Match Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[var(--color-mid)]/20">
        <h2 className="text-2xl font-black text-[var(--color-dark)] mb-6 uppercase tracking-tighter border-b border-[var(--color-mid)]/20 pb-4">Teams & Score</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[var(--color-light)] p-6 rounded-xl border border-[var(--color-mid)]/20">
            <h3 className="text-lg font-black text-[var(--color-primary)] mb-4 uppercase tracking-wider text-center">Home Team</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Team Name</label>
                <input name="home_team" value={currentReport.home_team} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-bold text-lg text-center" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Score</label>
                <input type="number" name="home_score" value={currentReport.home_score} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-black text-3xl text-center text-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Manager</label>
                <input name="home_manager" value={currentReport.home_manager} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold text-center" />
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-light)] p-6 rounded-xl border border-[var(--color-mid)]/20">
            <h3 className="text-lg font-black text-[var(--color-accent)] mb-4 uppercase tracking-wider text-center">Away Team</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Team Name</label>
                <input name="away_team" value={currentReport.away_team} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none transition-all font-bold text-lg text-center" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Score</label>
                <input type="number" name="away_score" value={currentReport.away_score} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none transition-all font-black text-3xl text-center text-[var(--color-accent)]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Manager</label>
                <input name="away_manager" value={currentReport.away_manager} onChange={handleChange} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none transition-all font-semibold text-center" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[var(--color-mid)]/20">
        <h2 className="text-2xl font-black text-[var(--color-dark)] mb-6 uppercase tracking-tighter border-b border-[var(--color-mid)]/20 pb-4">Notes</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Focus of the Report</label>
            <textarea name="focus" value={currentReport.focus} onChange={handleChange} rows={3} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold resize-y" placeholder="e.g. Analyzing the opposition's defensive shape..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">General Match Notes</label>
            <textarea name="general_notes" value={currentReport.general_notes} onChange={handleChange} rows={5} className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold resize-y" placeholder="Overall impressions of the match..." />
          </div>
        </div>
      </div>
    </div>
  );
}
