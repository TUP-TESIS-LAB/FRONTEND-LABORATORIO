import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AreaService } from './area.service';

describe('AreaService', () => {
  let service: AreaService;
  let httpMock: HttpTestingController;

  const emptyPage = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AreaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list calls GET /areas with default pagination params', () => {
    service.list().subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/sucursales/areas');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    req.flush(emptyPage);
  });

  it('create posts the input body', () => {
    const input = { name: 'Bioquímica', areaType: 'QUIMICA_CLINICA' as const, externalLabName: null };
    service.create(input).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/areas');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 1, ...input, active: true });
  });

  it('update sends PUT with body to areas/{id}', () => {
    const input = { name: 'Bioquímica general', areaType: 'QUIMICA_CLINICA' as const, externalLabName: null };
    service.update(1, input).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/areas/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 1, ...input, active: true });
  });

  it('toggleStatus sends PATCH to areas/{id}/status', () => {
    service.toggleStatus(1).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/areas/1/status');
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 1, name: 'Bioquímica', areaType: 'QUIMICA_CLINICA', externalLabName: null, active: false });
  });
});
