import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LabelPdfService } from './label-pdf.service';
import { HomeVisit, PreparedLabel } from '../models/home-visit.model';

/**
 * Specs para LabelPdfService.
 *
 * Las dinamic-imports de jsPDF/jsbarcode se mockean a nivel de módulo con
 * vi.mock para que `new jsPDF(...)` devuelva un doc falso controlable.
 */

// ── Mocks de módulos ──────────────────────────────────────────────────────────

const mockAutoPrint = vi.fn();
const mockOutput    = vi.fn().mockReturnValue('blob:mock-url');
const mockAddImage  = vi.fn();
const mockAddPage   = vi.fn();
const mockText      = vi.fn();
const mockSetFont   = vi.fn();
const mockSetFontSize = vi.fn();
const mockSplitText   = vi.fn((text: string) => [text]);

class MockJsPDF {
  autoPrint  = mockAutoPrint;
  output     = mockOutput;
  addImage   = mockAddImage;
  addPage    = mockAddPage;
  text       = mockText;
  setFont    = mockSetFont;
  setFontSize = mockSetFontSize;
  splitTextToSize = mockSplitText;
}

vi.mock('jspdf', () => ({ jsPDF: MockJsPDF }));

const mockJsBarcode = vi.fn();
vi.mock('jsbarcode', () => ({ default: mockJsBarcode }));

// ── Factory ───────────────────────────────────────────────────────────────────

function makeVisit(overrides: Partial<HomeVisit> = {}): HomeVisit {
  return {
    id: 1,
    appointmentId: 10,
    patientId: 20,
    branchId: 1,
    assignedExtractorId: null,
    attentionId: 99,
    addressStreet: 'Av. Siempre Viva',
    addressNumber: '100',
    addressCity: 'Springfield',
    addressReferences: null,
    timeWindowStart: '08:00:00',
    timeWindowEnd: '10:00:00',
    status: 'PROGRAMADA',
    scheduledAt: '2026-07-15T09:00:00',
    patientName: 'Juan García',
    patientDni: '30123456',
    extractorName: null,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LabelPdfService', () => {
  let service: LabelPdfService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOutput.mockReturnValue('blob:mock-url');
    // Mock canvas
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return { toDataURL: vi.fn().mockReturnValue('data:image/png;base64,X') } as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });
    vi.spyOn(window, 'open').mockImplementation(() => null);
    service = new LabelPdfService();
  });

  it('el servicio se instancia correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('generate() con labels vacíos retorna sin generar PDF ni abrir ventana', async () => {
    await service.generate(makeVisit(), []);
    expect(window.open).not.toHaveBeenCalled();
  });

  it('generate() con 1 label llama autoPrint y abre una ventana con el blobUrl', async () => {
    await service.generate(makeVisit(), [{ labelId: 101, analysisId: 201 }]);
    expect(mockAutoPrint).toHaveBeenCalledTimes(1);
    expect(window.open).toHaveBeenCalledWith('blob:mock-url', '_blank');
  });

  it('generate() con 3 labels llama addPage 2 veces (una por label extra)', async () => {
    const labels: PreparedLabel[] = [
      { labelId: 1, analysisId: 10 },
      { labelId: 2, analysisId: 20 },
      { labelId: 3, analysisId: 30 },
    ];
    await service.generate(makeVisit(), labels);
    expect(mockAddPage).toHaveBeenCalledTimes(2);
  });

  it('generate() llama text con el nombre del paciente', async () => {
    await service.generate(makeVisit({ patientName: 'María López' }), [{ labelId: 1, analysisId: 10 }]);
    const allTextArgs = mockText.mock.calls.flatMap((c: unknown[]) => c);
    expect(allTextArgs.some((a: unknown) => typeof a === 'string' && (a as string).includes('María López'))).toBe(true);
  });

  it('generate() llama text con el DNI del paciente', async () => {
    await service.generate(makeVisit({ patientDni: '20999888' }), [{ labelId: 1, analysisId: 10 }]);
    const allTextArgs = mockText.mock.calls.flatMap((c: unknown[]) => c);
    expect(allTextArgs.some((a: unknown) => typeof a === 'string' && (a as string).includes('20999888'))).toBe(true);
  });

  it('generate() llama text con el analysisId', async () => {
    await service.generate(makeVisit(), [{ labelId: 1, analysisId: 777 }]);
    const allTextArgs = mockText.mock.calls.flatMap((c: unknown[]) => c);
    expect(allTextArgs.some((a: unknown) => typeof a === 'string' && (a as string).includes('777'))).toBe(true);
  });

  it('generate() llama text con la ventana horaria formateada', async () => {
    await service.generate(
      makeVisit({ timeWindowStart: '09:30:00', timeWindowEnd: '11:00:00' }),
      [{ labelId: 1, analysisId: 10 }],
    );
    const allTextArgs = mockText.mock.calls.flatMap((c: unknown[]) => c);
    expect(allTextArgs.some((a: unknown) => typeof a === 'string' && (a as string).includes('09:30'))).toBe(true);
    expect(allTextArgs.some((a: unknown) => typeof a === 'string' && (a as string).includes('11:00'))).toBe(true);
  });

  it('generate() pasa el labelId como string a jsbarcode', async () => {
    await service.generate(makeVisit(), [{ labelId: 42, analysisId: 10 }]);
    expect(mockJsBarcode).toHaveBeenCalledWith(
      expect.anything(),
      '42',
      expect.objectContaining({ format: 'CODE128' }),
    );
  });
});
