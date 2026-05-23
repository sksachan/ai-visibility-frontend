/**
 * PDF export using html2canvas + jsPDF.
 * This file MUST exist at src/lib/pdf.ts for the frontend to build.
 */
import type { ReportBundle } from '../types/report';

export async function exportReportToPdf(report: ReportBundle, fileName: string): Promise<void> {
  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const root = document.getElementById('pdf-report-root');
    if (!root) {
      console.error('PDF render target #pdf-report-root not found');
      alert('PDF export failed: render target not found. Please try again.');
      return;
    }

    const origStyle = root.style.cssText;
    root.style.cssText = 'position: fixed; left: 0; top: 0; width: 1200px; z-index: 99999; background: #000; padding: 24px; overflow: visible;';

    await new Promise((resolve) => setTimeout(resolve, 300));

    const canvas = await html2canvas(root, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#000000',
      logging: false,
      windowWidth: 1200,
    });

    root.style.cssText = origStyle;

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');

    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text(`${report.brand} / ${report.market} - AI Brand Visibility Report`, 10, 8);
    pdf.text(report.generatedAt || new Date().toISOString(), 10, 13);

    let heightLeft = imgHeight;
    let position = 18;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - position);

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } catch (error) {
    console.error('PDF export failed:', error);
    alert(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
  }
}
