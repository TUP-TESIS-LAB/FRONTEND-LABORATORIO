import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpContext } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { PublicTenantBrandingService } from './public-tenant-branding.service';
import { SKIP_AUTH } from './public-display.service';

describe('PublicTenantBrandingService', () => {
  let service: PublicTenantBrandingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PublicTenantBrandingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the public white-label by slug with SKIP_AUTH', async () => {
    const mockResponse = {
      tenantSlug: 'lab-demo',
      systemName: 'Lab Demo',
      primaryColor: '#123456',
      secondaryColor: '#abcdef',
      lightLogoUrl: null,
      darkLogoUrl: null,
    };

    const result$ = firstValueFrom(service.getWhiteLabel('lab-demo'));
    const req = httpMock.expectOne('/public/tenants/lab-demo/white-label');

    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(SKIP_AUTH)).toBe(true);

    req.flush(mockResponse);

    const wl = await result$;
    expect(wl.systemName).toBe('Lab Demo');
    expect(wl.tenantSlug).toBe('lab-demo');
    expect(wl.primaryColor).toBe('#123456');
  });
});
