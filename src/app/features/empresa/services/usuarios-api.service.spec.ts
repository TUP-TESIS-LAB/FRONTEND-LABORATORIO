import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsuariosApiService } from './usuarios-api.service';

describe('UsuariosApiService', () => {
  let service: UsuariosApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UsuariosApiService],
    });
    service = TestBed.inject(UsuariosApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('search arma query con isExternal=false fijo', () => {
    service.search({ page: 1, size: 10, search: 'ana' }).subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/user/search');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('isExternal')).toBe('false');
    expect(req.request.params.get('search')).toBe('ana');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ content: [], page: 1, size: 10, totalElements: 0, totalPages: 0 });
  });

  it('create POST a /internal', () => {
    const payload = {
      firstName: 'A', lastName: 'B', email: 'a@b.com',
      document: '1', username: 'ab', roleIds: [1],
    };
    service.create(payload).subscribe();
    const req = http.expectOne('/api/v1/user/internal');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ user: {}, firstLoginToken: null });
  });

  it('toggleStatus PATCH a /{id}/status', () => {
    service.toggleStatus(7, { isActive: false, reason: 'baja' }).subscribe();
    const req = http.expectOne('/api/v1/user/7/status');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ isActive: false, reason: 'baja' });
    req.flush({});
  });
});
