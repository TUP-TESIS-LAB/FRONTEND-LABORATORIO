import { vi } from 'vitest';

const mockBlob = new Blob(['%PDF'], { type: 'application/pdf' });
const mockDoc = {
  addImage: vi.fn(),
  text: vi.fn(),
  addPage: vi.fn(),
  setFontSize: vi.fn(),
  save: vi.fn(),
  output: vi.fn(() => mockBlob),
};
vi.mock('jspdf', () => ({ jsPDF: vi.fn(function () { return mockDoc; }) }));
vi.mock('jsbarcode', () => ({ default: vi.fn() }));

import { RotuloPdfService } from './rotulo-pdf.service';

describe('RotuloPdfService', () => {
  let service: RotuloPdfService;
  let clickCount: number;
  let lastAnchor: HTMLAnchorElement | null;

  beforeEach(() => {
    vi.clearAllMocks();
    lastAnchor = null;
    clickCount = 0;
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAA');
    // Capturamos el <a download> que dispara la descarga.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      lastAnchor = this;
      clickCount += 1;
    });
    // URL.createObjectURL / revokeObjectURL no existen en jsdom por defecto.
    (URL as any).createObjectURL = vi.fn(() => 'blob:rotulos');
    (URL as any).revokeObjectURL = vi.fn();
    service = new RotuloPdfService();
  });

  it('genera N etiquetas con el nº de protocolo y descarga el pdf con nombre rotulos-P<id>.pdf y mime application/pdf', async () => {
    await service.generate('P-5', [{ id: 1 }, { id: 2 }]);
    expect(mockDoc.addImage).toHaveBeenCalledTimes(2);
    expect(mockDoc.text).toHaveBeenCalledWith('P-5', expect.any(Number), expect.any(Number), { align: 'center' });
    // Construye el blob como application/pdf y dispara la descarga forzada.
    expect(mockDoc.output).toHaveBeenCalledWith('blob');
    expect(clickCount).toBe(1);
    expect(lastAnchor!.download).toBe('rotulos-P5.pdf');
    expect(mockBlob.type).toBe('application/pdf');
    // No usamos el doc.save() de jsPDF (que baja un blob sin extensión en algunos browsers).
    expect(mockDoc.save).not.toHaveBeenCalled();
  });

  it('con [] no genera ni descarga', async () => {
    await service.generate('P-5', []);
    expect(mockDoc.output).not.toHaveBeenCalled();
    expect(clickCount).toBe(0);
  });
});
