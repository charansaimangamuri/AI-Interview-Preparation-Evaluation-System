import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePDFReport = ({
  candidateProfile,
  history,
  mlResult,
  topicScores,
  studyPlan,
  totalQuestions,
  eyeContactScore,
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Header Banner
  doc.setFillColor(37, 99, 235); // Blue #2563EB
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('AI Interview Performance & Diagnostic Report', 14, 18);

  // 2. Candidate Metadata Table
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  autoTable(doc, {
    startY: 34,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 65 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { cellWidth: 55 },
    },
    body: [
      ['Candidate Name:', candidateProfile?.name || 'Candidate', 'Evaluation Date:', currentDate],
      ['Target Role:', candidateProfile?.targetRole || 'Software Engineer', 'Questions Completed:', `${history.length} of ${totalQuestions}`],
      [
        'AI Predicted Score:',
        mlResult?.predicted_overall_score !== undefined
          ? `${Number(mlResult.predicted_overall_score).toFixed(1)} / 100`
          : 'Pending',
        'Camera Eye Contact:',
        eyeContactScore !== undefined && eyeContactScore !== null
          ? `${Math.round(eyeContactScore)}% (Vision AI)`
          : 'N/A (Audio Mode)',
      ],
    ],
  });

  // 3. Performance Summary & Topic Score Table
  const topicRows = Object.entries(topicScores || {}).map(([topic, score]) => [
    topic,
    `${Math.round(score)}%`,
    score >= 70 ? 'STRONG (Proficient)' : score >= 50 ? 'AVERAGE (Review)' : 'NEEDS IMPROVEMENT',
  ]);

  if (topicRows.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Technical Competency & Topic Breakdown', 14, doc.lastAutoTable.finalY + 10);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 14,
      head: [['Evaluated Topic Domain', 'Average Score', 'Assessment Category']],
      body: topicRows,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 3 },
    });
  }

  // 4. Question-by-Question Transcripts & Scores
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Detailed Question Transcripts & AI Feedback', 14, doc.lastAutoTable.finalY + 10);

  const transcriptRows = history.map((item, idx) => {
    const missed = item.evaluation?.missing_concepts?.length > 0 
      ? `\nMissed Concepts: ${item.evaluation.missing_concepts.join(', ')}` 
      : '';
    return [
      `Q${idx + 1} (${item.question?.topic || 'General'})`,
      item.question?.question || '',
      (item.answer || '').length > 250 ? item.answer.substring(0, 250) + '...' : (item.answer || ''),
      `${item.evaluation?.score ?? 0}/100`,
      `${item.evaluation?.feedback || ''}${missed}`,
    ];
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 14,
    head: [['#', 'Question', 'Candidate Response', 'Score', 'Feedback & Missed Concepts']],
    body: transcriptRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 42 },
      2: { cellWidth: 45 },
      3: { cellWidth: 16, fontStyle: 'bold', halign: 'center' },
      4: { cellWidth: 59 },
    },
  });

  // 5. 7-Day Personalized Study Plan
  if (studyPlan && typeof studyPlan === 'string') {
    doc.addPage();
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 15, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('Personalized 7-Day Targeted Remediation Plan', 14, 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    // Clean markdown characters like ** and *
    const cleanedPlan = studyPlan.replace(/\*\*/g, '').replace(/\*/g, '•');
    const splitPlan = doc.splitTextToSize(cleanedPlan, pageWidth - 28);
    doc.text(splitPlan, 14, 26);
  }

  // 6. Running Page Numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.text('Confidential - AI Interview Preparation & Evaluation System', 14, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 7);
  }

  // 7. Save file to client
  const filename = `Interview_Assessment_${candidateProfile?.name?.replace(/\s+/g, '_') || 'Report'}.pdf`;
  doc.save(filename);
};
