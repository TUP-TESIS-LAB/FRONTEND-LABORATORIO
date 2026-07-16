import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

export interface TotemTicketData {
  labName: string;
  branchName: string;
  /** Ya formateada: dd/mm/yyyy hh:mm */
  dateTime: string;
  /** N° de llamado: ST-001 / CT-001 */
  callNumber: string;
}

/** Ancho fijo del rollo térmico (mm). */
const WIDTH = 80;
/** Margen lateral e inferior (mm). El contenido nunca toca el borde. */
const MARGIN = 6;
/** Ancho útil para texto (mm): todo se centra y wrappea dentro de esta caja. */
const USABLE = WIDTH - MARGIN * 2;
const CENTER = WIDTH / 2;
/** 1pt = 0.352778mm. Para traducir tamaños de fuente a alto de línea en mm. */
const PT_TO_MM = 0.352778;
/** Factor de interlineado. */
const LINE_FACTOR = 1.15;

/**
 * Arma e imprime el ticket del tótem (PDF client-side). Mínimo de datos, sin PII.
 * Formato angosto (80mm) tipo comanda, con alto dinámico según el contenido.
 *
 * El layout se calcula en dos pasadas: la primera mide el alto real del contenido
 * (con wrap real de jsPDF) y la segunda dibuja sobre un documento del alto exacto.
 * Así el texto nunca se clipea ni queda papel en blanco de más. Fuerza el diálogo
 * de impresión (autoPrint).
 */
@Injectable({ providedIn: 'root' })
export class TotemTicketPdfService {

  printTicket(data: TotemTicketData): void {
    // 1ª pasada: medir el alto del contenido sobre un documento holgado.
    const measure = this.createDoc(200);
    const contentBottom = this.renderTicket(measure, data);
    const pageHeight = Math.ceil(contentBottom + MARGIN);

    // 2ª pasada: documento final con el alto exacto.
    const doc = this.createDoc(pageHeight);
    this.renderTicket(doc, data);

    doc.autoPrint();
    this.openInWindow(doc);
  }

  /** Dibuja el ticket y devuelve la coordenada Y (mm) donde termina el contenido. */
  private renderTicket(doc: jsPDF, data: TotemTicketData): number {
    let y = MARGIN;

    y = this.drawWrapped(doc, data.labName, 14, 'bold', y);
    y += 1.5;
    y = this.drawWrapped(doc, data.branchName, 11, 'normal', y);
    y += 0.5;
    y = this.drawWrapped(doc, data.dateTime, 10, 'normal', y);

    y += 6; // aire antes del número grande
    y = this.drawCallNumber(doc, data.callNumber, y);

    y += 6;
    y = this.drawWrapped(doc, 'Conserve este ticket', 9, 'normal', y);

    return y;
  }

  /**
   * Texto centrado con wrap dentro del ancho útil. Avanza `y` una línea por renglón
   * (a la baseline) y devuelve el `y` final.
   */
  private drawWrapped(doc: jsPDF, text: string, sizePt: number, style: 'normal' | 'bold', y: number): number {
    if (!text) return y;
    doc.setFont('helvetica', style);
    doc.setFontSize(sizePt);
    const lineHeight = sizePt * PT_TO_MM * LINE_FACTOR;
    const lines = doc.splitTextToSize(text, USABLE);
    for (const line of lines) {
      y += lineHeight;
      doc.text(line, CENTER, y, { align: 'center' });
    }
    return y;
  }

  /**
   * N° de llamado en grande, centrado. Auto-reduce el tamaño si no entra en el ancho
   * útil (ej. códigos de 4 dígitos como CT-1000) para que nunca se clipee.
   */
  private drawCallNumber(doc: jsPDF, callNumber: string, y: number): number {
    doc.setFont('helvetica', 'bold');
    let sizePt = 38;
    doc.setFontSize(sizePt);
    while (sizePt > 20 && doc.getTextWidth(callNumber) > USABLE) {
      sizePt -= 2;
      doc.setFontSize(sizePt);
    }
    const lineHeight = sizePt * PT_TO_MM * LINE_FACTOR;
    y += lineHeight;
    doc.text(callNumber, CENTER, y, { align: 'center' });
    return y;
  }

  // Aislados para poder mockearlos en test.
  protected createDoc(heightMm: number): jsPDF {
    // jsPDF acomoda el `format` según la orientación: en 'portrait' fuerza ancho <= alto
    // (intercambiaría los lados y dejaría el ticket de 70mm de ancho en vez de 80, des-
    // centrando todo). Elegimos la orientación según el alto para garantizar 80mm de ancho.
    const orientation = heightMm >= WIDTH ? 'portrait' : 'landscape';
    return new jsPDF({ orientation, unit: 'mm', format: [WIDTH, heightMm] });
  }

  protected openInWindow(doc: jsPDF): void {
    const url = doc.output('bloburl') as unknown as string;
    window.open(url, '_blank');
  }
}
