import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RotuloPdfService {
  /** Genera y abre/imprime un PDF (una etiqueta por label: barcode Code128 del id + nº de protocolo), igual que el ticket del tótem. Carga jsPDF/jsbarcode on-demand. */
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
    // Igual que el ticket del tótem: abrimos el PDF en una pestaña nueva y disparamos
    // el diálogo de impresión (autoPrint). NO descargamos un archivo — el operador
    // ve e imprime los rótulos directo, como con el ticket del tótem.
    doc.autoPrint();
    const url = doc.output('bloburl') as unknown as string;
    window.open(url, '_blank');
  }

  private barcodeDataUrl(JsBarcode: (canvas: HTMLCanvasElement, value: string, opts: object) => void, value: string): string {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, { format: 'CODE128', displayValue: false, margin: 0, height: 40 });
    return canvas.toDataURL('image/png');
  }
}
