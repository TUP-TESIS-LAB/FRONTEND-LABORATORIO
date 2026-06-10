import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RotuloPdfService {
  /** Genera y descarga un PDF con una etiqueta por label (barcode Code128 del id + nº de protocolo). Carga jsPDF/jsbarcode on-demand. */
  async generate(protocolNumber: string, labels: { id: number }[]): Promise<void> {
    if (labels.length === 0) return;
    const { jsPDF } = await import('jspdf');
    const { default: JsBarcode } = await import('jsbarcode');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const labelW = 60, labelH = 24, mX = 10, mY = 10, gX = 6, gY = 6, cols = 3;
    const pageH = 297;
    const rowsPerPage = Math.max(1, Math.floor((pageH - mY) / (labelH + gY)));
    const perPage = cols * rowsPerPage;
    labels.forEach((label, i) => {
      const posInPage = i % perPage;
      if (i > 0 && posInPage === 0) doc.addPage();
      const col = posInPage % cols;
      const row = Math.floor(posInPage / cols);
      const x = mX + col * (labelW + gX);
      const y = mY + row * (labelH + gY);
      doc.addImage(this.barcodeDataUrl(JsBarcode, String(label.id)), 'PNG', x, y, labelW, labelH - 8);
      doc.setFontSize(10);
      doc.text(protocolNumber, x + labelW / 2, y + labelH - 2, { align: 'center' });
    });
    // Descarga forzada: construimos un Blob `application/pdf` explícito y lo bajamos
    // con un <a download> con nombre `rotulos-P<id>.pdf`. No usamos doc.save() porque
    // en algunos navegadores baja un blob sin extensión ni mime (archivo "sin nombre"
    // que no se reconoce como PDF). Acá garantizamos mime + nombre correctos.
    const blob = doc.output('blob');
    this.triggerDownload(blob, this.fileName(protocolNumber));
  }

  /**
   * Nombre de archivo del PDF: `rotulos-P<protocolId>.pdf`.
   * El `protocolNumber` que recibimos viene como `P-9` (caption del rótulo), así que
   * normalizamos quitando el guion para no terminar con `rotulos-P-9.pdf`.
   */
  private fileName(protocolNumber: string): string {
    const normalized = protocolNumber.replace(/^P-?/, 'P');
    return `rotulos-${normalized}.pdf`;
  }

  /** Fuerza la descarga de un Blob como `application/pdf` vía un <a download> temporal. */
  private triggerDownload(blob: Blob, fileName: string): void {
    const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Liberar el object URL en el próximo tick (algunos navegadores necesitan que
    // siga vivo hasta que arranca la descarga).
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private barcodeDataUrl(JsBarcode: (canvas: HTMLCanvasElement, value: string, opts: object) => void, value: string): string {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, { format: 'CODE128', displayValue: false, margin: 0, height: 40 });
    return canvas.toDataURL('image/png');
  }
}
