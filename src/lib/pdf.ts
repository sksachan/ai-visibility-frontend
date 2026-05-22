/**
 * pdf.ts - Export the dashboard report to a multi-page PDF.
 *
 * Uses html2canvas to render the hidden #pdf-report-root element
 * and jsPDF to assemble the pages.
 */
import type { ReportBundle } from '../types/report';

export async function exportReportToPdf(
  _report: ReportBundle,
  fileName = 'ai_visibility_report.pdf',
): Promise<void> {
  // Dynamically import heavy libraries to keep the main bundle lean.
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const root = document.getElementById('pdf-report-root');
  if (!root) {
    console.warn('PDF export: #pdf-report-root element not found.');
    return;
  }

  // Temporarily make the hidden root visible for rendering.
  const prevStyle = root.style.cssText;
  root.style.cssText = 'position:fixed;left:0;top:0;width:1200px;z-index:99999;background:#f8fafc;padding:24px;';

  try {
    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 1200,
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } catch (error) {
    console.error('PDF export failed:', error);
  } finally {
    // Restore hidden state.
    root.style.cssText = prevStyle;
  }
}
