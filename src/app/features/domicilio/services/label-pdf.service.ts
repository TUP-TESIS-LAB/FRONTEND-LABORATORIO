import { Injectable } from '@angular/core';
import { HomeVisit, PreparedLabel } from '../models/home-visit.model';

/** Ancho fijo del rollo térmico (mm). */
const WIDTH = 80;
/** Margen lateral (mm). */
const MARGIN = 6;
/** Ancho útil para texto. */
const USABLE = WIDTH - MARGIN * 2;
const CENTER = WIDTH / 2;

/** Convierte 'HH:mm:ss' → 'HH:mm'. */
function formatTime(time: string): string {
  if (!time) return '—';
  return time.substring(0, 5);
}

/**
 * Genera e imprime un PDF de rótulos para una visita a domicilio.
 * Un rótulo por PreparedLabel, en formato 80mm (tipo rollo térmico).
 * Carga jsPDF + jsbarcode on-demand (code-split).
 */
@Injectable({ providedIn: 'root' })
export class LabelPdfService {

  async generate(visit: HomeVisit, labels: PreparedLabel[]): Promise<void> {
    if (labels.length === 0) return;

    const { jsPDF } = await import('jspdf');
    const { default: JsBarcode } = await import('jsbarcode');

    /** Alto de un rótulo individual (mm). */
    const LABEL_H = 38;
    /** Espacio vertical entre rótulos (mm). */
    const GAP = 4;

    const totalHeight = labels.length * LABEL_H + (labels.length - 1) * GAP + MARGIN * 2;

    // GOTCHA (de la memoria del tótem): jsPDF en 'portrait' intercambia [width, height]
    // cuando height < width, dejando la página de 70mm en lugar de 80mm. Elegimos la
    // orientación según cuál dimensión es mayor para garantizar 80mm de ancho.
    const orientation = totalHeight >= WIDTH ? 'portrait' : 'landscape';
    const doc = new jsPDF({ orientation, unit: 'mm', format: [WIDTH, Math.max(totalHeight, WIDTH + 1)] });

    labels.forEach((label, i) => {
      if (i > 0) doc.addPage();

      let y = MARGIN;

      // Barcode (CODE128, valor = labelId como string)
      const barcodeUrl = this.barcodeDataUrl(JsBarcode, String(label.labelId));
      const barcodeH = 16;
      doc.addImage(barcodeUrl, 'PNG', MARGIN, y, USABLE, barcodeH);
      y += barcodeH + 2;

      // Nombre del paciente
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const nameLines = doc.splitTextToSize(visit.patientName ?? '—', USABLE);
      for (const line of nameLines) {
        y += 4;
        doc.text(line, CENTER, y, { align: 'center' });
      }

      // DNI
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      y += 3.5;
      doc.text(`DNI: ${visit.patientDni ?? '—'}`, CENTER, y, { align: 'center' });

      // Análisis #analysisId
      y += 3.5;
      doc.text(`Análisis #${label.analysisId}`, CENTER, y, { align: 'center' });

      // Ventana horaria
      y += 3.5;
      const timeStr = `${formatTime(visit.timeWindowStart)} – ${formatTime(visit.timeWindowEnd)}`;
      doc.text(timeStr, CENTER, y, { align: 'center' });
    });

    doc.autoPrint();
    const url = doc.output('bloburl') as unknown as string;
    window.open(url, '_blank');
  }

  private barcodeDataUrl(
    JsBarcode: (canvas: HTMLCanvasElement, value: string, opts: object) => void,
    value: string,
  ): string {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, { format: 'CODE128', displayValue: false, margin: 0, height: 40 });
    return canvas.toDataURL('image/png');
  }
}
