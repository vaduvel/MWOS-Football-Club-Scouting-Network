import { useState } from 'react';
import { useReportStore } from '../../store/report';
import { Download, FileText, CheckCircle } from 'lucide-react';

export default function ExportTab() {
  const { currentReport } = useReportStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

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
    
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      // Create a temporary hidden div to render the report for PDF
      const printContainer = document.createElement('div');
      printContainer.style.position = 'absolute';
      printContainer.style.left = '-9999px';
      printContainer.style.top = '0';
      printContainer.style.width = '800px'; // Fixed width for consistent PDF
      printContainer.style.backgroundColor = 'white';
      printContainer.style.color = '#2C2E43';
      printContainer.style.fontFamily = 'sans-serif';
      document.body.appendChild(printContainer);

      // Render content into the container (simplified HTML representation)
      printContainer.innerHTML = `
        <div style="padding: 40px;">
          <!-- Header -->
          <div style="border-bottom: 2px solid #312783; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <h1 style="color: #312783; margin: 0; font-size: 28px; text-transform: uppercase;">Scouting Report</h1>
              <p style="margin: 5px 0 0 0; color: #8E9AAF; font-size: 14px;">PFSA Standard Format</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-weight: bold;">Scout: ${currentReport.scout_name}</p>
              <p style="margin: 5px 0 0 0; color: #8E9AAF; font-size: 12px;">Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <!-- Match Details -->
          <div style="margin-bottom: 40px;">
            <h2 style="background-color: #EDF2F4; padding: 10px; margin: 0 0 20px 0; font-size: 16px; text-transform: uppercase;">Match Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Competition:</strong> ${currentReport.competition}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date:</strong> ${currentReport.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Venue:</strong> ${currentReport.venue}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Kick-off:</strong> ${currentReport.kickoff}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Weather:</strong> ${currentReport.weather}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Pitch:</strong> ${currentReport.pitch}</td>
              </tr>
            </table>
          </div>

          <!-- Score -->
          <div style="margin-bottom: 40px; text-align: center; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-around; align-items: center;">
              <div style="flex: 1;">
                <h3 style="margin: 0; font-size: 20px;">${currentReport.home_team || 'Home'}</h3>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #8E9AAF;">Manager: ${currentReport.home_manager}</p>
              </div>
              <div style="font-size: 36px; font-weight: bold; color: #312783; padding: 0 20px;">
                ${currentReport.home_score} - ${currentReport.away_score}
              </div>
              <div style="flex: 1;">
                <h3 style="margin: 0; font-size: 20px;">${currentReport.away_team || 'Away'}</h3>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #8E9AAF;">Manager: ${currentReport.away_manager}</p>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div style="margin-bottom: 40px;">
            <h2 style="background-color: #EDF2F4; padding: 10px; margin: 0 0 20px 0; font-size: 16px; text-transform: uppercase;">Match Notes</h2>
            <div style="margin-bottom: 20px;">
              <h4 style="margin: 0 0 5px 0; font-size: 14px;">Focus of Report</h4>
              <p style="margin: 0; font-size: 14px; line-height: 1.5;">${currentReport.focus || 'N/A'}</p>
            </div>
            <div>
              <h4 style="margin: 0 0 5px 0; font-size: 14px;">General Notes</h4>
              <p style="margin: 0; font-size: 14px; line-height: 1.5;">${currentReport.general_notes || 'N/A'}</p>
            </div>
          </div>

          <!-- Team Sheets (Simplified for PDF) -->
          <div style="margin-bottom: 40px;">
             <h2 style="background-color: #EDF2F4; padding: 10px; margin: 0 0 20px 0; font-size: 16px; text-transform: uppercase;">Key Players</h2>
             <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr style="background-color: #312783; color: white;">
                  <th style="padding: 8px; text-align: left;">Team</th>
                  <th style="padding: 8px; text-align: left;">No.</th>
                  <th style="padding: 8px; text-align: left;">Name</th>
                  <th style="padding: 8px; text-align: center;">Rating</th>
                </tr>
                ${currentReport.players.filter(p => p.rating && Number(p.rating) >= 7).map(p => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.team_side === 'home' ? currentReport.home_team : currentReport.away_team}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.shirt_number}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${p.name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; color: #312783; font-weight: bold;">${p.rating}</td>
                  </tr>
                `).join('')}
             </table>
          </div>
          
          <!-- Tactical Formations -->
          <div style="page-break-before: always; padding-top: 40px; margin-bottom: 40px;">
            <h2 style="background-color: #EDF2F4; padding: 10px; margin: 0 0 20px 0; font-size: 16px; text-transform: uppercase;">Tactical Formations</h2>
            <div style="display: flex; justify-content: space-between; gap: 20px;">
              <!-- Home Pitch -->
              <div style="flex: 1; text-align: center;">
                <h3 style="margin: 0 0 10px 0; color: #312783;">${currentReport.home_team || 'Home'} (${currentReport.formation_home || '4-3-3'})</h3>
                <div style="position: relative; width: 100%; aspect-ratio: 2/3; background-color: #4CAF50; border: 2px solid white; box-sizing: border-box;">
                  <!-- Pitch Markings -->
                  <div style="position: absolute; top: 0; left: 25%; width: 50%; height: 15%; border-bottom: 1px solid rgba(255,255,255,0.6); border-left: 1px solid rgba(255,255,255,0.6); border-right: 1px solid rgba(255,255,255,0.6);"></div>
                  <div style="position: absolute; bottom: 0; left: 25%; width: 50%; height: 15%; border-top: 1px solid rgba(255,255,255,0.6); border-left: 1px solid rgba(255,255,255,0.6); border-right: 1px solid rgba(255,255,255,0.6);"></div>
                  <div style="position: absolute; top: 50%; left: 0; width: 100%; border-top: 1px solid rgba(255,255,255,0.6);"></div>
                  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20%; aspect-ratio: 1; border: 1px solid rgba(255,255,255,0.6); border-radius: 50%;"></div>
                  
                  <!-- Home Players -->
                  ${currentReport.players.filter(p => p.team_side === 'home').map(p => `
                    <div style="position: absolute; left: ${p.position_x}%; top: ${p.position_y}%; transform: translate(-50%, -50%); width: 24px; height: 24px; background-color: #312783; color: white; border: 1px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
                      ${p.shirt_number || '-'}
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <!-- Away Pitch -->
              <div style="flex: 1; text-align: center;">
                <h3 style="margin: 0 0 10px 0; color: #BE1717;">${currentReport.away_team || 'Away'} (${currentReport.formation_away || '4-3-3'})</h3>
                <div style="position: relative; width: 100%; aspect-ratio: 2/3; background-color: #4CAF50; border: 2px solid white; box-sizing: border-box;">
                  <!-- Pitch Markings -->
                  <div style="position: absolute; top: 0; left: 25%; width: 50%; height: 15%; border-bottom: 1px solid rgba(255,255,255,0.6); border-left: 1px solid rgba(255,255,255,0.6); border-right: 1px solid rgba(255,255,255,0.6);"></div>
                  <div style="position: absolute; bottom: 0; left: 25%; width: 50%; height: 15%; border-top: 1px solid rgba(255,255,255,0.6); border-left: 1px solid rgba(255,255,255,0.6); border-right: 1px solid rgba(255,255,255,0.6);"></div>
                  <div style="position: absolute; top: 50%; left: 0; width: 100%; border-top: 1px solid rgba(255,255,255,0.6);"></div>
                  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20%; aspect-ratio: 1; border: 1px solid rgba(255,255,255,0.6); border-radius: 50%;"></div>
                  
                  <!-- Away Players -->
                  ${currentReport.players.filter(p => p.team_side === 'away').map(p => `
                    <div style="position: absolute; left: ${p.position_x}%; top: ${p.position_y}%; transform: translate(-50%, -50%); width: 24px; height: 24px; background-color: #BE1717; color: white; border: 1px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
                      ${p.shirt_number || '-'}
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- Reviews Summary -->
          ${currentReport.reviews.length > 0 ? `
            <div style="page-break-before: always; padding-top: 40px;">
              <h2 style="background-color: #EDF2F4; padding: 10px; margin: 0 0 20px 0; font-size: 16px; text-transform: uppercase;">Player Reviews</h2>
              ${currentReport.reviews.map(r => {
                const p = currentReport.players.find(pl => pl.id.toString() === r.player_id.toString());
                return `
                  <div style="border: 1px solid #eee; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
                    <h3 style="margin: 0 0 10px 0; color: #312783;">${p ? p.name : 'Unknown Player'} <span style="font-size: 12px; color: #8E9AAF; font-weight: normal;">(${r.potential_level})</span></h3>
                    <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Overview:</strong> ${r.overview}</p>
                    <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Verdict:</strong> ${r.recommendation_verdict}</p>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      `;

      // Wait a moment for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(printContainer, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width / 2;
      const imgHeight = canvas.height / 2;
      
      // Calculate ratio to fit width
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      let heightLeft = scaledHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
      heightLeft -= pdfHeight;

      // Add subsequent pages if content overflows
      while (heightLeft >= 0) {
        position = heightLeft - scaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`ScoutReport_${currentReport.home_team}_vs_${currentReport.away_team}.pdf`);
      
      document.body.removeChild(printContainer);
      setExportSuccess(true);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
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
              Build a clean PDF for coaches, scouts or academy leadership.
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
              <li className="flex items-center text-sm font-semibold text-[var(--color-dark)]">
                <CheckCircle size={16} className="mr-3 text-[var(--color-primary)]" /> Match details and notes
              </li>
              <li className="flex items-center text-sm font-semibold text-[var(--color-dark)]">
                <CheckCircle size={16} className="mr-3 text-[var(--color-primary)]" /> Team sheets and ratings
              </li>
              <li className="flex items-center text-sm font-semibold text-[var(--color-dark)]">
                <CheckCircle size={16} className="mr-3 text-[var(--color-primary)]" /> Tactical formations
              </li>
              <li className="flex items-center text-sm font-semibold text-[var(--color-dark)]">
                <CheckCircle size={16} className="mr-3 text-[var(--color-primary)]" /> Player reviews ({currentReport.reviews.length})
              </li>
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

      {exportSuccess && (
        <div className="flex items-center justify-center rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">
          <CheckCircle size={18} className="mr-2" />
          PDF generated successfully. Check your downloads.
        </div>
      )}

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
