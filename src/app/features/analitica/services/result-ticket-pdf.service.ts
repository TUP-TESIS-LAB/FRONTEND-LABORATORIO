import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

export interface ResultTicketItem {
  name: string;
  duration: string;
}

export interface ResultTicketData {
  labName?: string;
  patientName: string;
  patientDni: string;
  /** Ya formateada: dd/mm/yyyy hh:mm */
  dateTime: string;
  items: ResultTicketItem[];
}

/**
 * Formatea la duración estimada de un análisis para el comprobante.
 * Sólo HOURS/DAYS; cualquier otra cosa (o value/unit faltante) → texto "a confirmar".
 */
export function formatHandlingTime(
  value: number | null,
  unit: 'HOURS' | 'DAYS' | string | null,
): string {
  if (value == null || value <= 0 || unit == null) return 'a confirmar en el laboratorio';
  if (unit === 'HOURS') return `${value} ${value === 1 ? 'hora' : 'horas'}`;
  if (unit === 'DAYS') return `${value} ${value === 1 ? 'día' : 'días'}`;
  return 'a confirmar en el laboratorio';
}

const WIDTH = 80;
const MARGIN = 6;
const USABLE = WIDTH - MARGIN * 2;
const CENTER = WIDTH / 2;
const PT_TO_MM = 0.352778;
const LINE_FACTOR = 1.15;

/**
 * Comprobante de atención para el paciente (PDF client-side, rollo 80mm). Lista los
 * análisis solicitados con su tiempo estimado de resultado. Dos pasadas (mide y dibuja)
 * para alto exacto; fuerza el diálogo de impresión (autoPrint), igual que el ticket del tótem.
 */
@Injectable({ providedIn: 'root' })
export class ResultTicketPdfService {

  printTicket(data: ResultTicketData): void {
    const measure = this.createDoc(400);
    const contentBottom = this.render(measure, data);
    const pageHeight = Math.ceil(contentBottom + MARGIN);

    const doc = this.createDoc(pageHeight);
    this.render(doc, data);

    doc.autoPrint();
    this.openInWindow(doc);
  }

  private render(doc: jsPDF, data: ResultTicketData): number {
    let y = MARGIN;
    if (data.labName) {
      y = this.drawWrapped(doc, data.labName, 13, 'bold', y, 'center');
      y += 1;
    }
    y = this.drawWrapped(doc, 'Comprobante de atención', 11, 'bold', y, 'center');
    y += 2;
    y = this.drawWrapped(doc, `${data.patientName}`, 10, 'normal', y, 'center');
    y = this.drawWrapped(doc, `DNI ${data.patientDni}`, 9, 'normal', y, 'center');
    y = this.drawWrapped(doc, data.dateTime, 9, 'normal', y, 'center');

    y += 4;
    y = this.drawWrapped(doc, 'Análisis y tiempo estimado', 9, 'bold', y, 'left');
    y += 1;
    for (const item of data.items) {
      y = this.drawWrapped(doc, item.name, 9, 'bold', y, 'left');
      y = this.drawWrapped(doc, item.duration, 9, 'normal', y, 'left');
      y += 1;
    }

    y += 4;
    y = this.drawWrapped(doc, 'Los tiempos son estimados y pueden variar.', 8, 'normal', y, 'center');
    y = this.drawWrapped(doc, 'Conserve este comprobante.', 8, 'normal', y, 'center');
    return y;
  }

  private drawWrapped(
    doc: jsPDF, text: string, sizePt: number, style: 'normal' | 'bold', y: number,
    align: 'center' | 'left',
  ): number {
    if (!text) return y;
    doc.setFont('helvetica', style);
    doc.setFontSize(sizePt);
    const lineHeight = sizePt * PT_TO_MM * LINE_FACTOR;
    const lines = doc.splitTextToSize(text, USABLE);
    const x = align === 'center' ? CENTER : MARGIN;
    for (const line of lines) {
      y += lineHeight;
      doc.text(line, x, y, { align });
    }
    return y;
  }

  protected createDoc(heightMm: number): jsPDF {
    const orientation = heightMm >= WIDTH ? 'portrait' : 'landscape';
    return new jsPDF({ orientation, unit: 'mm', format: [WIDTH, heightMm] });
  }

  protected openInWindow(doc: jsPDF): void {
    const url = doc.output('bloburl') as unknown as string;
    window.open(url, '_blank');
  }
}
