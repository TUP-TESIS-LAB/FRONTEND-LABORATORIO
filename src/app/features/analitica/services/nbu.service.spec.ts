import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { NbuService } from './nbu.service';

describe('NbuService', () => {
  let http: { get: ReturnType<typeof vi.fn> };
  let service: NbuService;

  beforeEach(() => {
    http = { get: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        NbuService,
        { provide: HttpClient, useValue: http },
      ],
    });
    service = TestBed.inject(NbuService);
  });

  it('getCurrent returns the version on success', async () => {
    http.get.mockReturnValue(of({ id: 1, tenantId: 1, effectiveDate: '2026-05-01', ubValue: 350 }));
    const result = await firstValueFrom(service.getCurrent());
    expect(result?.ubValue).toBe(350);
  });

  it('getCurrent returns null on 404 (module not deployed yet)', async () => {
    http.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const result = await firstValueFrom(service.getCurrent());
    expect(result).toBeNull();
  });

  it('getCurrent returns null on any other http error (defensive)', async () => {
    http.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const result = await firstValueFrom(service.getCurrent());
    expect(result).toBeNull();
  });
});
