import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ObraSocialService } from './obra-social.service';

describe('ObraSocialService (backend)', () => {
  let service: ObraSocialService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ObraSocialService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ObraSocialService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search GET /insurers con state/page/size y mapea a summary', async () => {
    const p = firstValueFrom(service.search({ state: 'active', page: 0, size: 20 }));
    const req = httpMock.expectOne((r) => r.url === '/api/v1/coverages/insurers');
    expect(req.request.params.get('state')).toBe('active');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    req.flush({
      content: [{
        id: 96002, code: 'OSDE', name: 'OSDE', acronym: 'OSDE',
        insurerType: 'PRIVATE', insurerTypeName: 'Prepaga',
        description: null, authorizationUrl: null, cuit: '30-1-9', copayPolicy: null,
        acceptedPaymentMethods: null, active: true,
      }],
      totalElements: 1, totalPages: 1, page: 0, size: 20,
    });
    const res = await p;
    expect(res.totalElements).toBe(1);
    expect(res.content[0]).toEqual({
      id: 96002, code: 'OSDE', acronym: 'OSDE', name: 'OSDE',
      insurerType: 'PRIVATE', insurerTypeName: 'Prepaga', active: true,
    });
  });

  it('search agrega q e insurerType cuando vienen', async () => {
    const p = firstValueFrom(service.search({ state: 'all', q: 'osde', insurerType: 'PRIVATE', page: 0, size: 50 }));
    const req = httpMock.expectOne((r) => r.url === '/api/v1/coverages/insurers');
    expect(req.request.params.get('q')).toBe('osde');
    expect(req.request.params.get('insurerType')).toBe('PRIVATE');
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 50 });
    await p;
  });

  it('getCompleteById GET /insurers/{id}/complete y mapea specificData/planes/contactos', async () => {
    const p = firstValueFrom(service.getCompleteById(96002));
    const req = httpMock.expectOne('/api/v1/coverages/insurers/96002/complete');
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 96002, code: 'OSDE', name: 'OSDE', acronym: 'OSDE',
      insurerType: 'PRIVATE', insurerTypeName: 'Prepaga',
      description: null, authorizationUrl: 'https://osde', cuit: '30-1-9',
      copayPolicy: 'Copago según plan', acceptedPaymentMethods: null, active: true,
      contacts: [{ id: 1, contactType: 'PHONE', contact: '0810', active: true }],
      plans: [{
        id: 96002, insurerId: 96002, code: 'OSDE-210', acronym: '210', name: '210',
        description: null, iva: 21, particular: false, active: true,
        currentAgreement: { id: 5, insurerPlanId: 96002, versionNbu: null, ubValue: 1500, validFromDate: '2025-01-01', validToDate: null, active: true },
      }],
    });
    const os = await p;
    expect(os.specificData?.privateHealth?.cuit).toBe('30-1-9');
    expect(os.specificData?.privateHealth?.copayPolicy).toBe('Copago según plan');
    expect(os.plans).toHaveLength(1);
    expect(os.plans[0].insurerName).toBe('OSDE');
    expect(os.plans[0].actualAgreements[0].ubValue).toBe(1500);
    expect(os.contacts).toHaveLength(1);
    expect(os.contacts[0].contactType).toBe('PHONE');
  });

  it('getCompleteById SOCIAL mapea cuit a socialHealth y plan sin convenio queda sin agreements', async () => {
    const p = firstValueFrom(service.getCompleteById(96003));
    httpMock.expectOne('/api/v1/coverages/insurers/96003/complete').flush({
      id: 96003, code: 'IOMA', name: 'IOMA', acronym: 'IOMA',
      insurerType: 'SOCIAL', insurerTypeName: 'Obra Social',
      description: null, authorizationUrl: null, cuit: '30-9-1', copayPolicy: null,
      acceptedPaymentMethods: null, active: true,
      contacts: [],
      plans: [{
        id: 96003, insurerId: 96003, code: 'IOMA-PMO', acronym: 'PMO', name: 'Plan PMO',
        description: null, iva: 21, particular: false, active: true, currentAgreement: null,
      }],
    });
    const os = await p;
    expect(os.specificData?.socialHealth?.cuit).toBe('30-9-1');
    expect(os.plans[0].actualAgreements).toEqual([]);
  });

  it('getInsurerTypes / getContactTypes pegan a sus endpoints; getNbuVersions es catálogo fijo', async () => {
    const types = firstValueFrom(service.getInsurerTypes());
    httpMock.expectOne('/api/v1/coverages/insurer-types').flush([{ name: 'SOCIAL', description: 'Obra Social' }]);
    expect((await types).length).toBe(1);

    const contacts = firstValueFrom(service.getContactTypes());
    httpMock.expectOne('/api/v1/coverages/contact-types').flush([{ name: 'PHONE', description: 'Teléfono' }]);
    expect((await contacts).length).toBe(1);

    expect((await firstValueFrom(service.getNbuVersions())).length).toBeGreaterThan(0);
  });
});
