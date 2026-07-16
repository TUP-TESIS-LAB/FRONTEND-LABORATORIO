import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProfileApiService } from './profile-api.service';

describe('ProfileApiService', () => {
  let service: ProfileApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProfileApiService],
    });
    service = TestBed.inject(ProfileApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('changePassword PUTs to /api/v1/user/{id}/password with credentials', async () => {
    const promise = service.changePassword(42, 'old12345', 'new12345');
    const req = http.expectOne('/api/v1/user/42/password');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ currentPassword: 'old12345', newPassword: 'new12345' });
    req.flush(null);
    await promise;
  });
});
