import { describe, expect, it, vi } from 'vitest';
import { TotemTicketPdfService, TotemTicketData } from './totem-ticket-pdf.service';

interface TextCall { text: string; x: number; y: number; opts: { align?: string } | undefined; }

/** Mock de jsPDF que registra los `text(...)` para inspeccionar contenido, orden y centrado. */
function makeDocMock() {
  const calls: TextCall[] = [];
  const doc = {
    calls,
    setFontSize: vi.fn().mockReturnThis(),
    setFont: vi.fn().mockReturnThis(),
    text: vi.fn((text: string, x: number, y: number, opts?: { align?: string }) => {
      calls.push({ text: String(text), x, y, opts });
    }),
    // Sin wrap: cada texto entra en una sola línea.
    splitTextToSize: vi.fn((t: string) => [t]),
    // Ancho chico => nunca dispara el auto-reduce del callNumber.
    getTextWidth: vi.fn().mockReturnValue(10),
    autoPrint: vi.fn(),
    output: vi.fn().mockReturnValue('blob:url'),
  };
  return doc;
}

function build() {
  const doc = makeDocMock();
  const svc = new TotemTicketPdfService();
  (svc as any).createDoc = vi.fn(() => doc);
  (svc as any).openInWindow = vi.fn();
  return { doc, svc, createDoc: (svc as any).createDoc };
}

const DATA: TotemTicketData = {
  labName: 'Lab Demo',
  branchName: 'Sucursal Centro',
  dateTime: '07/06/2026 14:30',
  callNumber: 'ST-001',
};

describe('TotemTicketPdfService', () => {
  it('writes lab, branch, datetime, call number and keep-ticket message in order', () => {
    const { doc, svc } = build();
    svc.printTicket(DATA);

    const texts = doc.calls.map(c => c.text);
    expect(texts).toContain('Lab Demo');
    expect(texts).toContain('Sucursal Centro');
    expect(texts).toContain('07/06/2026 14:30');
    expect(texts).toContain('ST-001');
    expect(texts).toContain('Conserve este ticket');
    // Orden vertical (primera aparición de cada bloque).
    expect(texts.indexOf('Lab Demo')).toBeLessThan(texts.indexOf('Sucursal Centro'));
    expect(texts.indexOf('Sucursal Centro')).toBeLessThan(texts.indexOf('07/06/2026 14:30'));
    expect(texts.indexOf('07/06/2026 14:30')).toBeLessThan(texts.indexOf('ST-001'));
    expect(texts.indexOf('ST-001')).toBeLessThan(texts.indexOf('Conserve este ticket'));
    expect(doc.autoPrint).toHaveBeenCalled();
  });

  it('centers every line horizontally (x = 40mm, align center)', () => {
    const { doc, svc } = build();
    svc.printTicket(DATA);

    for (const call of doc.calls) {
      expect(call.x).toBe(40);
      expect(call.opts?.align).toBe('center');
    }
  });

  it('measures content first, then renders on a page of the exact height', () => {
    const { svc, createDoc } = build();
    svc.printTicket(DATA);

    // 1ª llamada: pasada de medición (alto holgado). 2ª: documento final con alto calculado.
    expect(createDoc).toHaveBeenCalledTimes(2);
    const measureHeight = createDoc.mock.calls[0][0];
    const finalHeight = createDoc.mock.calls[1][0];
    expect(measureHeight).toBeGreaterThan(finalHeight);
    expect(finalHeight).toBeGreaterThan(0);
  });

  it('wraps long text within the usable width', () => {
    const { doc, svc } = build();
    svc.printTicket({ ...DATA, labName: 'Laboratorio de Análisis Bioquímicos San Martín' });

    // El ancho útil (80 - 2*6 = 68mm) se pasa a splitTextToSize para que jsPDF wrappee.
    expect(doc.splitTextToSize).toHaveBeenCalledWith(
      'Laboratorio de Análisis Bioquímicos San Martín',
      68,
    );
  });

  it('shrinks the call number font when it does not fit the usable width', () => {
    const { doc, svc } = build();
    // Primero no entra (>68mm), luego sí: fuerza al menos una reducción.
    doc.getTextWidth
      .mockReturnValueOnce(80)
      .mockReturnValue(40);
    svc.printTicket({ ...DATA, callNumber: 'CT-1000' });

    const sizes = doc.setFontSize.mock.calls.map(c => c[0]);
    // El callNumber arranca en 38pt; al no entrar baja a 36pt.
    expect(sizes).toContain(38);
    expect(sizes).toContain(36);
  });
});
