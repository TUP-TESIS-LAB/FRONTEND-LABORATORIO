import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SectionService } from './section.service';

describe('SectionService', () => {
  let service: SectionService;
  let httpMock: HttpTestingController;

  const emptyPage = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list calls GET /sections with default pagination params', () => {
    service.list().subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/sucursales/sections');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.has('areaId')).toBe(false);
    req.flush(emptyPage);
  });

  it('list appends areaId query param when provided', () => {
    service.list({ areaId: 9 }).subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/v1/sucursales/sections');
    expect(req.request.params.get('areaId')).toBe('9');
    req.flush(emptyPage);
  });

  it('create posts the input body', () => {
    const input = { name: 'Hematología', areaId: 2 };
    service.create(input).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/sections');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 1, ...input, active: true });
  });

  it('update sends PUT with body to sections/{id}', () => {
    const input = { name: 'Hematología actualizada', areaId: 2 };
    service.update(1, input).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/sections/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 1, ...input, active: true });
  });

  it('toggleStatus sends PATCH to sections/{id}/status', () => {
    service.toggleStatus(1).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/sections/1/status');
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 1, name: 'Hematología', areaId: 2, active: false });
  });
});
