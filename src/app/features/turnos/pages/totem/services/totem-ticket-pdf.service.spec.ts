import { describe, expect, it, vi } from 'vitest';
import { TotemTicketPdfService, TotemTicketData } from './totem-ticket-pdf.service';

describe('TotemTicketPdfService', () => {
  it('writes lab, branch, datetime, call number and keep-ticket message', () => {
    const calls: string[] = [];
    const docMock = {
      setFontSize: vi.fn().mockReturnThis(),
      setFont: vi.fn().mockReturnThis(),
      text: vi.fn((t: string) => { calls.push(String(t)); }),
      autoPrint: vi.fn(),
      output: vi.fn().mockReturnValue('blob:url'),
    };
    const svc = new TotemTicketPdfService();
    (svc as any).createDoc = () => docMock;
    (svc as any).openInWindow = vi.fn();

    const data: TotemTicketData = {
      labName: 'Lab Demo',
      branchName: 'Sucursal Centro',
      dateTime: '07/06/2026 14:30',
      callNumber: 'ST-001',
    };
    svc.printTicket(data);

    expect(calls).toContain('Lab Demo');
    expect(calls).toContain('Sucursal Centro');
    expect(calls).toContain('07/06/2026 14:30');
    expect(calls).toContain('ST-001');
    expect(calls).toContain('Conserve este ticket');
    expect(calls.indexOf('Lab Demo')).toBeLessThan(calls.indexOf('Sucursal Centro'));
    expect(calls.indexOf('Sucursal Centro')).toBeLessThan(calls.indexOf('07/06/2026 14:30'));
    expect(calls.indexOf('07/06/2026 14:30')).toBeLessThan(calls.indexOf('ST-001'));
    expect(docMock.autoPrint).toHaveBeenCalled();
  });
});
