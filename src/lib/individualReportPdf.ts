import type { Report } from '../store/report';

export async function buildIndividualReportPdf(report: Report) {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let y = 20;
  const text = (value: string, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(bold ? 12 : 10);
    const lines: string[] = pdf.splitTextToSize(value || 'Not provided', 174);
    for (const line of lines) {
      if (y > 277) { pdf.addPage(); y = 20; }
      pdf.text(line, 18, y);
      y += 5;
    }
    y += 3;
  };
  text('MWOS - INDIVIDUAL PLAYER REPORT', true);
  text(report.players[0]?.name || 'Unnamed player', true);
  text(`Club: ${report.home_team || 'Not provided'}`);
  text(`Observed: ${report.date || 'Not provided'} | Location: ${report.venue || 'Not provided'}`);
  text(`Scout: ${report.scout_name || 'Not provided'}`);
  for (const review of report.reviews) {
    for (const [label, value] of [['Overview', review.overview], ['Strengths', review.strengths], ['Areas to improve', review.areas_to_improve], ['Verdict', review.recommendation_verdict], ['Potential', review.potential_level]]) {
      text(label, true); text(value);
    }
    text('Evaluation (1-5)', true);
    for (const [label, value] of [['Pace', review.pace], ['Strength', review.strength], ['Stamina', review.stamina], ['Agility', review.agility], ['Decision making', review.decision_making], ['Composure', review.composure], ['Work rate', review.work_rate], ['Positioning', review.positioning]]) text(`${label}: ${value}/5`);
  }
  return pdf;
}
