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

  it('create posts the input body', () => {
    const input = { name: 'Hematología' };
    service.create(input).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/sections');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 1, ...input, active: true });
  });

  it('update sends PUT with body to sections/{id}', () => {
    const input = { name: 'Hematología actualizada' };
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
    req.flush({ id: 1, name: 'Hematología', active: false });
  });

  it('delete sends DELETE to sections/{id}', () => {
    service.delete(1).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/sections/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('listWithBranches calls GET /sections and returns items with branches (KAN-218)', () => {
    let received: unknown;
    service.listWithBranches({ page: 0, size: 100 }).subscribe((page) => (received = page));
    const req = httpMock.expectOne((r) => r.url === '/api/v1/sucursales/sections');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('100');
    const body = {
      ...emptyPage,
      content: [{ id: 1, name: 'Hematología', active: true, branches: [{ id: 9, code: 'B1', name: 'Central' }] }],
      totalElements: 1,
    };
    req.flush(body);
    expect(received).toEqual(body);
  });
});
