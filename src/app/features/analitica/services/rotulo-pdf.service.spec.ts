import { vi } from 'vitest';

const mockDoc = { addImage: vi.fn(), text: vi.fn(), addPage: vi.fn(), setFontSize: vi.fn(), save: vi.fn() };
vi.mock('jspdf', () => ({ jsPDF: vi.fn(function () { return mockDoc; }) }));
vi.mock('jsbarcode', () => ({ default: vi.fn() }));

import { RotuloPdfService } from './rotulo-pdf.service';

describe('RotuloPdfService', () => {
  let service: RotuloPdfService;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAA');
    service = new RotuloPdfService();
  });

  it('genera N etiquetas con el nº de protocolo y guarda el pdf', () => {
    service.generate('P-5', [{ id: 1 }, { id: 2 }]);
    expect(mockDoc.addImage).toHaveBeenCalledTimes(2);
    expect(mockDoc.text).toHaveBeenCalledWith('P-5', expect.any(Number), expect.any(Number), { align: 'center' });
    expect(mockDoc.save).toHaveBeenCalledWith('rotulos-P-5.pdf');
  });

  it('con [] no genera ni guarda', () => {
    service.generate('P-5', []);
    expect(mockDoc.save).not.toHaveBeenCalled();
  });
});
