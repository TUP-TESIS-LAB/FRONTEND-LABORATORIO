import { describe, it, expect, vi } from 'vitest';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { triggerDownload, filenameFromDisposition } from './blob-download';

describe('filenameFromDisposition', () => {
  it('lee filename="..."', () => {
    expect(filenameFromDisposition('attachment; filename="comprobante-9.pdf"')).toBe('comprobante-9.pdf');
  });

  it('lee filename*=UTF-8\'\'... con caracteres codificados', () => {
    expect(filenameFromDisposition("attachment; filename*=UTF-8''comprobante%20final.pdf")).toBe('comprobante final.pdf');
  });

  it('devuelve null si no hay filename', () => {
    expect(filenameFromDisposition('attachment')).toBeNull();
  });
});

describe('triggerDownload', () => {
  it('usa el filename del Content-Disposition y dispara el click del anchor', () => {
    const createUrl = vi.fn(() => 'blob:url');
    const revokeUrl = vi.fn();
    (globalThis as unknown as { URL: { createObjectURL: unknown; revokeObjectURL: unknown } }).URL.createObjectURL = createUrl;
    (globalThis as unknown as { URL: { createObjectURL: unknown; revokeObjectURL: unknown } }).URL.revokeObjectURL = revokeUrl;
    const click = vi.fn();
    const anchor = { href: '', download: '', click, remove: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);

    const res = new HttpResponse<Blob>({
      body: new Blob(['x']),
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="comprobante-9.pdf"' }),
    });
    triggerDownload(res, 'comprobante-9.pdf');

    expect(click).toHaveBeenCalled();
    expect(anchor.download).toBe('comprobante-9.pdf');
    expect(createUrl).toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalledWith('blob:url');
    vi.restoreAllMocks();
  });

  it('cae al filename fallback si no hay Content-Disposition', () => {
    const createUrl = vi.fn(() => 'blob:url');
    const revokeUrl = vi.fn();
    (globalThis as unknown as { URL: { createObjectURL: unknown; revokeObjectURL: unknown } }).URL.createObjectURL = createUrl;
    (globalThis as unknown as { URL: { createObjectURL: unknown; revokeObjectURL: unknown } }).URL.revokeObjectURL = revokeUrl;
    const click = vi.fn();
    const anchor = { href: '', download: '', click, remove: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);

    const res = new HttpResponse<Blob>({ body: new Blob(['x']) });
    triggerDownload(res, 'comprobante-5.pdf');

    expect(anchor.download).toBe('comprobante-5.pdf');
    vi.restoreAllMocks();
  });

  it('lanza si el body viene vacío', () => {
    const res = new HttpResponse<Blob>({ body: null });
    expect(() => triggerDownload(res, 'x.pdf')).toThrow();
  });
});
