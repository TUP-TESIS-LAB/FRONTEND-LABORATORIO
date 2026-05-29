import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BranchTotemConfigService } from './branch-totem-config.service';

describe('BranchTotemConfigService', () => {
  let service: BranchTotemConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BranchTotemConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('get calls GET on branches/{branchId}/totem-config', () => {
    service.get(4).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/4/totem-config');
    expect(req.request.method).toBe('GET');
    req.flush({ branchId: 4, enabled: true });
  });

  it('get returns null on 404', () => {
    let result: unknown = 'not-called';
    service.get(4).subscribe(val => (result = val));
    const req = httpMock.expectOne('/api/v1/sucursales/branches/4/totem-config');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(result).toBeNull();
  });

  it('get propagates non-404 errors', () => {
    let error: unknown;
    service.get(4).subscribe({ error: e => (error = e) });
    const req = httpMock.expectOne('/api/v1/sucursales/branches/4/totem-config');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    expect(error).toBeDefined();
  });

  it('upsert sends PUT with enabled body', () => {
    service.upsert(4, true).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/4/totem-config');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ enabled: true });
    req.flush({ branchId: 4, enabled: true });
  });

  it('upsert sends PUT with enabled=false', () => {
    service.upsert(4, false).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/4/totem-config');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ enabled: false });
    req.flush({ branchId: 4, enabled: false });
  });
});
