import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RolesApiService } from './roles-api.service';

describe('RolesApiService', () => {
  let service: RolesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), RolesApiService],
    });
    service = TestBed.inject(RolesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list GET /api/v1/role/', () => {
    service.list().subscribe();
    const req = http.expectOne('/api/v1/role/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
