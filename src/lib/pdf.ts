/**
 * PDF export — renders the off-screen report root to a multi-page PDF using
 * html2canvas + jsPDF (both listed in package.json).
 */
import type { ReportBundle } from '../types/report';

export async function exportReportToPdf(report: ReportBundle, fileName = 'ai_visibility_report.pdf'): Promise<void> {
  const root = document.getElementById('pdf-report-root');
  if (!root) {
    console.warn('PDF export: #pdf-report-root not found in DOM.');
    return;
  }

  // Dynamic imports keep the main bundle small.
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(root, {
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: 1200,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdfWidth = 210; // A4 mm
  const pdfHeight = 297;
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let position = 0;
  let remaining = imgHeight;

  while (remaining > 0) {
    if (position > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
    position += pdfHeight;
    remaining -= pdfHeight;
  }

  // Add metadata
  pdf.setProperties({
    title: `AI Visibility Report — ${report.brand} / ${report.market}`,
    subject: `Run: ${report.runId}`,
    creator: 'AI Brand Visibility Dashboard',
  });

  pdf.save(fileName);
}
