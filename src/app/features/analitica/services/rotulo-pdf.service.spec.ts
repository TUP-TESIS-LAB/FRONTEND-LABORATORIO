import { vi } from 'vitest';

const mockDoc = {
  addImage: vi.fn(),
  text: vi.fn(),
  addPage: vi.fn(),
  setFontSize: vi.fn(),
  save: vi.fn(),
  autoPrint: vi.fn(),
  output: vi.fn(() => 'blob:rotulos'),
};
vi.mock('jspdf', () => ({ jsPDF: vi.fn(function () { return mockDoc; }) }));
vi.mock('jsbarcode', () => ({ default: vi.fn() }));

import { RotuloPdfService } from './rotulo-pdf.service';

describe('RotuloPdfService', () => {
  let service: RotuloPdfService;
  let windowOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAA');
    windowOpen = vi.fn();
    vi.spyOn(window, 'open').mockImplementation(windowOpen as unknown as typeof window.open);
    service = new RotuloPdfService();
  });

  it('por defecto genera N etiquetas con el nº de protocolo y abre/imprime el pdf en una pestaña nueva (botón "Rótulos")', async () => {
    await service.generate('P-5', [{ id: 1 }, { id: 2 }]);
    expect(mockDoc.addImage).toHaveBeenCalledTimes(2);
    expect(mockDoc.text).toHaveBeenCalledWith('P-5', expect.any(Number), expect.any(Number), { align: 'center' });
    // Dispara el diálogo de impresión y abre el blob en una pestaña, NO descarga un archivo.
    expect(mockDoc.autoPrint).toHaveBeenCalledTimes(1);
    expect(mockDoc.output).toHaveBeenCalledWith('bloburl');
    expect(windowOpen).toHaveBeenCalledWith('blob:rotulos', '_blank');
    // No usamos doc.save() (que baja un archivo en vez de imprimir).
    expect(mockDoc.save).not.toHaveBeenCalled();
  });

  it("con output 'download' baja el archivo y no abre pestaña ni diálogo de impresión", async () => {
    await service.generate('P-5', [{ id: 1 }], 'download');
    expect(mockDoc.addImage).toHaveBeenCalledTimes(1);
    expect(mockDoc.save).toHaveBeenCalledWith('rotulos-P-5.pdf');
    expect(mockDoc.autoPrint).not.toHaveBeenCalled();
    expect(windowOpen).not.toHaveBeenCalled();
  });

  it('con [] no genera ni abre nada', async () => {
    await service.generate('P-5', []);
    expect(mockDoc.output).not.toHaveBeenCalled();
    expect(mockDoc.autoPrint).not.toHaveBeenCalled();
    expect(windowOpen).not.toHaveBeenCalled();
  });
});
