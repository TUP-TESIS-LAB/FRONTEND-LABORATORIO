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

/**
 * Arma e imprime el ticket del tótem (PDF client-side). Mínimo de datos, sin PII.
 * Formato angosto (80mm) tipo comanda. Fuerza el diálogo de impresión (autoPrint).
 */
@Injectable({ providedIn: 'root' })
export class TotemTicketPdfService {

  printTicket(data: TotemTicketData): void {
    const doc = this.createDoc();
    const w = 80; // mm
    const center = w / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(data.labName, center, 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(data.branchName, center, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(data.dateTime, center, 28, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(34);
    doc.text(data.callNumber, center, 48, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Conserve este ticket', center, 60, { align: 'center' });

    doc.autoPrint();
    this.openInWindow(doc);
  }

  // Aislados para poder mockearlos en test.
  protected createDoc(): jsPDF {
    return new jsPDF({ unit: 'mm', format: [80, 70] });
  }

  protected openInWindow(doc: jsPDF): void {
    const url = doc.output('bloburl') as unknown as string;
    window.open(url, '_blank');
  }
}
