// src/app/features/saas-admin/store/saas-admin.effects.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, ReplaySubject, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { Action } from '@ngrx/store';
import { SaasAdminApiService } from '../services/saas-admin-api.service';
import { SaasAdminEffects } from './saas-admin.effects';
import * as A from './saas-admin.actions';

describe('SaasAdminEffects', () => {
  let actions$: ReplaySubject<Action>;
  let api: Partial<Record<keyof SaasAdminApiService, ReturnType<typeof vi.fn>>>;
  let effects: SaasAdminEffects;

  beforeEach(() => {
    actions$ = new ReplaySubject(1);
    api = {
      listTenants: vi.fn(),
      getTenant: vi.fn(),
      createTenant: vi.fn(),
      renameTenant: vi.fn(),
      activateTenant: vi.fn(),
      deactivateTenant: vi.fn(),
      softDeleteTenant: vi.fn(),
      listTenantModules: vi.fn(),
      toggleTenantModule: vi.fn(),
      getTenantWhiteLabel: vi.fn(),
      upsertTenantWhiteLabel: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        SaasAdminEffects,
        provideMockActions(() => actions$),
        { provide: SaasAdminApiService, useValue: api },
      ],
    });
    effects = TestBed.inject(SaasAdminEffects);
  });

  function expectEmits(stream: Observable<Action>): Promise<Action> {
    return firstValueFrom(stream.pipe(take(1)));
  }

  it('loadTenants$ → loadTenantsSuccess', async () => {
    api.listTenants!.mockResolvedValue([{ id: 1, code: 'a', name: 'A', status: 'ACTIVE', active: true, deletedAt: null }]);
    actions$.next(A.loadTenants());
    const out = await expectEmits(effects.loadTenants$);
    expect(out.type).toBe(A.loadTenantsSuccess.type);
  });

  it('createTenant$ → createTenantSuccess with the created tenant', async () => {
    const created = { id: 2, code: 'x', name: 'X', status: 'ACTIVE' as const, active: true, deletedAt: null };
    api.createTenant!.mockResolvedValue(created);
    actions$.next(A.createTenant({ req: { code: 'x', name: 'X' } }));
    const out = await expectEmits(effects.createTenant$);
    expect(out).toEqual(A.createTenantSuccess({ tenant: created }));
  });

  it('toggleTenantModule$ → toggleTenantModuleSuccess echoing the requested values', async () => {
    api.toggleTenantModule!.mockResolvedValue(undefined);
    actions$.next(A.toggleTenantModule({ tenantId: 1, code: 'PORTAL', enable: true }));
    const out = await expectEmits(effects.toggleTenantModule$);
    expect(out).toEqual(A.toggleTenantModuleSuccess({ tenantId: 1, code: 'PORTAL', enabled: true }));
  });

  it('softDeleteTenant$ → softDeleteTenantSuccess with the id', async () => {
    api.softDeleteTenant!.mockResolvedValue(undefined);
    actions$.next(A.softDeleteTenant({ id: 7 }));
    const out = await expectEmits(effects.softDeleteTenant$);
    expect(out).toEqual(A.softDeleteTenantSuccess({ id: 7 }));
  });

  it('createTenant$ emits createTenantFailure on rejection', async () => {
    api.createTenant!.mockRejectedValue({ status: 409 });
    actions$.next(A.createTenant({ req: { code: 'x', name: 'X' } }));
    const out = await expectEmits(effects.createTenant$);
    expect(out.type).toBe(A.createTenantFailure.type);
  });
});
