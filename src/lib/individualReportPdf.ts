import type { Report } from '../store/report';
import { hasTipsContent, TIPS_ASSESSMENTS, TIPS_SECTIONS } from './tipsEvaluationDomain';

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
  text(`Position(s): ${report.players[0]?.position || 'Not provided'}`);
  text(`Observed: ${report.date || 'Not provided'} | Location: ${report.venue || 'Not provided'}`);
  text(`Scout: ${report.scout_name || 'Not provided'}`);
  for (const review of report.reviews) {
    for (const [label, value] of [['Overview', review.overview], ['Strengths', review.strengths], ['Areas to improve', review.areas_to_improve], ['Verdict', review.recommendation_verdict], ['Potential', review.potential_level]]) {
      text(label, true); text(value);
    }
    text('Evaluation (1-5)', true);
    for (const [label, value] of [['Pace', review.pace], ['Strength', review.strength], ['Stamina', review.stamina], ['Agility', review.agility], ['Decision making', review.decision_making], ['Composure', review.composure], ['Work rate', review.work_rate], ['Positioning', review.positioning]]) text(`${label}: ${value}/5`);
  }
  const tips = report.tips_evaluation;
  if (tips && hasTipsContent(tips)) {
    pdf.addPage(); y = 20;
    text('MWOS - TIPS PLAYER EVALUATION (1-10)', true);
    text(`Player: ${report.players[0]?.name || 'Unnamed player'} | Scout: ${report.scout_name || 'Not provided'}`);
    text(`Position(s): ${tips.positions || report.players[0]?.position || 'Not provided'} | Preferred foot: ${tips.preferredFoot || 'Not provided'}`);
    text(`Nationality: ${tips.nationality || 'Not provided'} | Current club: ${report.home_team || 'Not provided'}`);
    text(`Match observed: ${tips.matchObserved || 'Not provided'} | Report date: ${report.date || 'Not provided'}`);
    text(`Competition / level: ${tips.competitionLevel || 'Not provided'}`);
    for (const section of TIPS_SECTIONS) {
      if (y > 235) { pdf.addPage(); y = 20; }
      text(section.title.toUpperCase(), true);
      for (const [key, label] of section.attributes) {
        const entry = tips.attributes[key];
        text(`${label}: ${entry.score === '' ? 'Not scored' : `${entry.score}/10`}${entry.notes ? ` - ${entry.notes}` : ''}`);
      }
    }
    text('OTHER NOTES', true); text(tips.otherNotes);
    text('PHYSICALITY', true); text(tips.physicality);
    text('OVERALL ASSESSMENT', true);
    text(TIPS_ASSESSMENTS.find(option => option.value === tips.overallAssessment)?.label || 'Not selected');
    text('TIPS scores are separate from the 1-5 individual evaluation.');
  }
  return pdf;
}
