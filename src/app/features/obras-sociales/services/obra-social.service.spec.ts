import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ObraSocialService } from './obra-social.service';
import { WizardCreate } from '../models/wizard.model';

describe('ObraSocialService (mock)', () => {
  let service: ObraSocialService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ObraSocialService] });
    service = TestBed.inject(ObraSocialService);
  });

  it('search devuelve solo activas por defecto y pagina', async () => {
    const res = await firstValueFrom(service.search({ state: 'active', page: 0, size: 20 }));
    expect(res.content.length).toBeGreaterThan(0);
    expect(res.content.every((o) => o.active)).toBe(true);
    expect(res.totalElements).toBe(res.content.length);
  });

  it('search state=inactive devuelve solo inactivas', async () => {
    const res = await firstValueFrom(service.search({ state: 'inactive', page: 0, size: 20 }));
    expect(res.content.every((o) => !o.active)).toBe(true);
  });

  it('search filtra por insurerType', async () => {
    const res = await firstValueFrom(service.search({ state: 'all', insurerType: 'SOCIAL', page: 0, size: 20 }));
    expect(res.content.every((o) => o.insurerType === 'SOCIAL')).toBe(true);
  });

  it('search filtra por q (nombre/sigla/código, case-insensitive)', async () => {
    const res = await firstValueFrom(service.search({ state: 'all', q: 'osde', page: 0, size: 20 }));
    expect(res.content.some((o) => o.name.toLowerCase().includes('osde'))).toBe(true);
  });

  it('getCompleteById devuelve la obra social con planes y contactos', async () => {
    const os = await firstValueFrom(service.getCompleteById(1));
    expect(os.id).toBe(1);
    expect(os.plans.length).toBeGreaterThan(0);
  });

  it('getCompleteById de id inexistente emite error', async () => {
    await expect(firstValueFrom(service.getCompleteById(99999))).rejects.toBeTruthy();
  });

  it('createFromWizard agrega y queda recuperable por getCompleteById', async () => {
    const payload: WizardCreate = {
      insurer: {
        code: 'NEW', name: 'Nueva OS', acronym: 'NOS', insurerType: 'SOCIAL',
        description: 'desc', authorizationUrl: '', specificData: { socialHealth: { cuit: '30-11111111-1' } },
      },
      plans: [{
        plan: { code: 'P1', acronym: 'P1', name: 'Plan 1', iva: 21 },
        agreement: { versionNbu: 3, requiresCopayment: false, coveragePercentage: 90, ubValue: 1000, validFromDate: '2026-01-01' },
      }],
      contacts: [{ contactType: 'PHONE', contact: '123' }],
    };
    const created = await firstValueFrom(service.createFromWizard(payload));
    expect(created.id).toBeGreaterThan(0);
    expect(created.insurerTypeName).toBe('Obra Social');
    const fetched = await firstValueFrom(service.getCompleteById(created.id));
    expect(fetched.name).toBe('Nueva OS');
    expect(fetched.plans[0].actualAgreements[0].coveragePercentage).toBe(90);
  });

  it('getInsurerTypes / getNbuVersions / getContactTypes devuelven catálogos', async () => {
    expect((await firstValueFrom(service.getInsurerTypes())).length).toBe(3);
    expect((await firstValueFrom(service.getNbuVersions())).length).toBeGreaterThan(0);
    expect((await firstValueFrom(service.getContactTypes())).length).toBe(4);
  });
});
