// src/app/features/saas-admin/services/saas-admin-api.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SaasAdminApiService } from './saas-admin-api.service';

const BASE = '/api/v1/saas-admin';

describe('SaasAdminApiService', () => {
  let service: SaasAdminApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SaasAdminApiService],
    });
    service = TestBed.inject(SaasAdminApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /tenants', () => {
    const p = service.listTenants();
    const req = http.expectOne(`${BASE}/tenants`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
    return p;
  });

  it('POST /tenants manda los 7 campos y tipa la respuesta con ownerFirstLoginToken', () => {
    const req_body = {
      code: 'lab-x', name: 'Lab X',
      ownerFirstName: 'Juan', ownerLastName: 'García',
      ownerEmail: 'juan@lab.com', ownerDocument: '28345678', ownerUsername: 'jgarcia',
    };
    const p = service.createTenant(req_body);
    const req = http.expectOne(`${BASE}/tenants`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(req_body);
    const response = {
      id: 1, code: 'lab-x', name: 'Lab X', status: 'ACTIVE', active: true, deletedAt: null,
      ownerFirstLoginToken: 'tok-abc123',
    };
    req.flush(response);
    return p.then((res) => {
      expect(res.ownerFirstLoginToken).toBe('tok-abc123');
    });
  });

  it('PUT /tenants/:id', () => {
    const p = service.renameTenant(7, { name: 'New' });
    const req = http.expectOne(`${BASE}/tenants/7`);
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 7, code: 'x', name: 'New', status: 'ACTIVE', active: true, deletedAt: null });
    return p;
  });

  it('POST /tenants/:id/activate and /deactivate', async () => {
    const p1 = service.activateTenant(3);
    http.expectOne(`${BASE}/tenants/3/activate`).flush({ id: 3, code: 'x', name: 'X', status: 'ACTIVE', active: true, deletedAt: null });
    await p1;
    const p2 = service.deactivateTenant(3);
    http.expectOne(`${BASE}/tenants/3/deactivate`).flush({ id: 3, code: 'x', name: 'X', status: 'INACTIVE', active: true, deletedAt: null });
    await p2;
  });

  it('DELETE /tenants/:id', () => {
    const p = service.softDeleteTenant(9);
    const req = http.expectOne(`${BASE}/tenants/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    return p;
  });

  it('GET /tenants/:id/modules', () => {
    const p = service.listTenantModules(1);
    const req = http.expectOne(`${BASE}/tenants/1/modules`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
    return p;
  });

  it('PUT /tenants/:id/modules/:code', () => {
    const p = service.toggleTenantModule(1, 'PORTAL', true);
    const req = http.expectOne(`${BASE}/tenants/1/modules/PORTAL`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ enable: true });
    req.flush(null);
    return p;
  });

  it('GET and PUT /tenants/:id/white-label', async () => {
    const p1 = service.getTenantWhiteLabel(1);
    http.expectOne(`${BASE}/tenants/1/white-label`).flush({});
    await p1;
    const p2 = service.upsertTenantWhiteLabel(1, {
      systemName: 'X', primaryColor: '#000000', secondaryColor: '#ffffff',
      lightLogoUrl: null, darkLogoUrl: null,
    });
    const req = http.expectOne(`${BASE}/tenants/1/white-label`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
    await p2;
  });
});
