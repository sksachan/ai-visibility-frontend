import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { ReportBundle } from '../types/report';

/**
 * Export the dashboard report to PDF.
 * 
 * Uses the off-screen #pdf-report-root element which renders all report sections.
 * Before capture, we temporarily replace any CSS color functions that html2canvas
 * cannot parse (e.g. oklab, oklch, color-mix) with fallback hex values.
 */
export async function exportReportToPdf(report: ReportBundle, fileName: string): Promise<void> {
  const root = document.getElementById('pdf-report-root');
  if (!root) throw new Error('PDF render target not found.');

  // ── Temporarily patch unsupported CSS color functions ──────────
  // html2canvas cannot parse oklab(), oklch(), color-mix() etc.
  // We walk all computed styles and replace them with fallback values.
  const patchedElements: Array<{ el: HTMLElement; prop: string; original: string }> = [];
  const unsupportedColorRe = /\b(oklab|oklch|color-mix|color|lch|lab)\s*\(/i;

  function patchColors(el: HTMLElement) {
    const style = getComputedStyle(el);
    const colorProps = ['color', 'background-color', 'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'box-shadow', 'text-shadow'];
    for (const prop of colorProps) {
      const val = style.getPropertyValue(prop);
      if (val && unsupportedColorRe.test(val)) {
        patchedElements.push({ el, prop, original: el.style.getPropertyValue(prop) });
        // Replace with a safe fallback
        const fallback = prop.includes('background') ? '#131313' : prop.includes('border') ? '#232323' : '#edf2f5';
        el.style.setProperty(prop, fallback, 'important');
      }
    }
    for (const child of el.children) {
      if (child instanceof HTMLElement) patchColors(child);
    }
  }

  try {
    // Make the off-screen root visible for capture
    root.style.position = 'fixed';
    root.style.left = '0';
    root.style.top = '0';
    root.style.zIndex = '-1';
    root.style.opacity = '1';

    patchColors(root);

    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#000000',
      width: 1200,
      windowWidth: 1200,
    });

    // Restore off-screen position
    root.style.position = 'fixed';
    root.style.left = '-10000px';
    root.style.zIndex = '';
    root.style.opacity = '';

    // Restore patched colors
    for (const { el, prop, original } of patchedElements) {
      if (original) el.style.setProperty(prop, original);
      else el.style.removeProperty(prop);
    }

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let yOffset = 0;
    let pageNum = 0;

    while (yOffset < imgHeight) {
      if (pageNum > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, 10 - yOffset, imgWidth, imgHeight);
      yOffset += pageHeight - 20;
      pageNum++;
    }

    // Add metadata header
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`${report.brand} / ${report.market} — AI Brand Visibility Intelligence — ${report.generatedAt || new Date().toISOString()}`, 10, 5);

    pdf.save(fileName);
  } catch (error) {
    // Restore off-screen position on error
    root.style.position = 'fixed';
    root.style.left = '-10000px';
    root.style.zIndex = '';
    root.style.opacity = '';

    // Restore patched colors on error
    for (const { el, prop, original } of patchedElements) {
      if (original) el.style.setProperty(prop, original);
      else el.style.removeProperty(prop);
    }

    throw new Error(`PDF export failed: ${error instanceof Error ? error.message : String(error)}. Please try again.`);
  }
}
