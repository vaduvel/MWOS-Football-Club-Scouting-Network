import { useState } from 'react';
import { useReportStore } from '../../store/report';
import { Download, FileText, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ExportTab() {
  const { currentReport } = useReportStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!currentReport) return null;

  const generatePDF = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    
    try {
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[var(--color-mid)]/20 text-center">
        <div className="w-20 h-20 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText size={40} />
        </div>
        
        <h2 className="text-3xl font-black text-[var(--color-dark)] uppercase tracking-tighter mb-2">Export Report</h2>
        <p className="text-[var(--color-mid)] font-semibold mb-8">
          Generate a professional PDF document containing all match details, team sheets, formations, and player reviews.
        </p>

        <div className="bg-[var(--color-light)] p-6 rounded-xl border border-[var(--color-mid)]/20 text-left mb-8">
          <h3 className="font-bold text-[var(--color-dark)] mb-4 uppercase tracking-wider text-sm">Included in Export:</h3>
          <ul className="space-y-3">
            <li className="flex items-center text-sm font-semibold text-[var(--color-dark)]">
              <CheckCircle size={16} className="text-[var(--color-primary)] mr-3" /> Match Details & Notes
            </li>
            <li className="flex items-center text-sm font-semibold text-[var(--color-dark)]">
              <CheckCircle size={16} className="text-[var(--color-primary)] mr-3" /> Home & Away Team Sheets
            </li>
            <li className="flex items-center text-sm font-semibold text-[var(--color-dark)]">
              <CheckCircle size={16} className="text-[var(--color-primary)] mr-3" /> Tactical Formations (Pitch View)
            </li>
            <li className="flex items-center text-sm font-semibold text-[var(--color-dark)]">
              <CheckCircle size={16} className="text-[var(--color-primary)] mr-3" /> Detailed Player Reviews ({currentReport.reviews.length})
            </li>
          </ul>
        </div>

        <button 
          onClick={generatePDF}
          disabled={isExporting}
          className="w-full bg-[var(--color-primary)] text-white py-4 rounded-xl font-black uppercase tracking-wider flex items-center justify-center space-x-3 hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <span>Generating PDF...</span>
          ) : (
            <>
              <Download size={24} />
              <span>Download PDF Report</span>
            </>
          )}
        </button>

        {exportSuccess && (
          <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-xl font-bold text-sm flex items-center justify-center">
            <CheckCircle size={18} className="mr-2" />
            PDF generated successfully! Check your downloads.
          </div>
        )}
      </div>
    </div>
  );
}
