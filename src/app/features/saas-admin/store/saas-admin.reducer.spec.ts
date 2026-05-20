import { HttpErrorResponse } from '@angular/common/http';
import { Tenant } from '../models/tenant.model';
import * as A from './saas-admin.actions';
import { initialSaasAdminState } from './saas-admin.state';
import { saasAdminReducer } from './saas-admin.reducer';

const sampleTenant = (over: Partial<Tenant> = {}): Tenant => ({
  id: 1, code: 'demo', name: 'Demo', status: 'ACTIVE', active: true, deletedAt: null, ...over,
});

describe('saasAdminReducer', () => {
  it('loadTenants sets pending', () => {
    const next = saasAdminReducer(initialSaasAdminState, A.loadTenants());
    expect(next.pending).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadTenantsSuccess stores tenants and clears pending', () => {
    const tenants = [sampleTenant(), sampleTenant({ id: 2, code: 'x', name: 'X' })];
    const next = saasAdminReducer({ ...initialSaasAdminState, pending: true }, A.loadTenantsSuccess({ tenants }));
    expect(next.tenants).toEqual(tenants);
    expect(next.pending).toBe(false);
  });

  it('createTenantSuccess prepends to list', () => {
    const t1 = sampleTenant({ id: 1 });
    const t2 = sampleTenant({ id: 2, code: 'b', name: 'B' });
    const next = saasAdminReducer({ ...initialSaasAdminState, tenants: [t1] }, A.createTenantSuccess({ tenant: t2 }));
    expect(next.tenants).toEqual([t2, t1]);
  });

  it('renameTenantSuccess updates the matching tenant in list and selected', () => {
    const t = sampleTenant({ id: 5, name: 'Old' });
    const updated = { ...t, name: 'New' };
    const next = saasAdminReducer(
      { ...initialSaasAdminState, tenants: [t], selectedTenant: t },
      A.renameTenantSuccess({ tenant: updated }),
    );
    expect(next.tenants[0].name).toBe('New');
    expect(next.selectedTenant?.name).toBe('New');
  });

  it('activateTenantSuccess swaps status to ACTIVE', () => {
    const t = sampleTenant({ status: 'INACTIVE' });
    const next = saasAdminReducer(
      { ...initialSaasAdminState, tenants: [t] },
      A.activateTenantSuccess({ tenant: { ...t, status: 'ACTIVE' } }),
    );
    expect(next.tenants[0].status).toBe('ACTIVE');
  });

  it('softDeleteTenantSuccess marks the tenant as deleted', () => {
    const t = sampleTenant({ id: 7 });
    const next = saasAdminReducer(
      { ...initialSaasAdminState, tenants: [t] },
      A.softDeleteTenantSuccess({ id: 7 }),
    );
    expect(next.tenants[0].active).toBe(false);
    expect(next.tenants[0].deletedAt).toBeTruthy();
  });

  it('loadTenantModulesSuccess stores enabled codes only', () => {
    const next = saasAdminReducer(initialSaasAdminState, A.loadTenantModulesSuccess({
      tenantId: 1,
      modules: [
        { moduleCode: 'PORTAL', enabled: true },
        { moduleCode: 'TURNOS', enabled: false },
        { moduleCode: 'STOCK',  enabled: true },
      ],
    }));
    expect(next.selectedTenantModules).toEqual(['PORTAL', 'STOCK']);
  });

  it('toggleTenantModuleSuccess adds/removes from the set', () => {
    const after1 = saasAdminReducer(
      { ...initialSaasAdminState, selectedTenantModules: ['PORTAL'] },
      A.toggleTenantModuleSuccess({ tenantId: 1, code: 'TURNOS', enabled: true }),
    );
    expect(after1.selectedTenantModules).toEqual(['PORTAL', 'TURNOS']);

    const after2 = saasAdminReducer(after1, A.toggleTenantModuleSuccess({ tenantId: 1, code: 'PORTAL', enabled: false }));
    expect(after2.selectedTenantModules).toEqual(['TURNOS']);
  });

  it('createTenantFailure stores the error', () => {
    const error = new HttpErrorResponse({ status: 409 });
    const next = saasAdminReducer({ ...initialSaasAdminState, pending: true }, A.createTenantFailure({ error }));
    expect(next.pending).toBe(false);
    expect(next.error).toBe(error);
  });
});
