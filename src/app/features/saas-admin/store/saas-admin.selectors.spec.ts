import { Tenant } from '../models/tenant.model';
import { initialSaasAdminState, SAAS_ADMIN_FEATURE_KEY, SaasAdminState } from './saas-admin.state';
import {
  selectActiveTenants, selectDashboardCounts, selectDeletedTenants,
  selectInactiveTenants, selectTenantsList,
} from './saas-admin.selectors';

const t = (over: Partial<Tenant>): Tenant => ({
  id: 0, code: 'x', name: 'X', status: 'ACTIVE', active: true, deletedAt: null, ...over,
});

function wrap(state: SaasAdminState): { [SAAS_ADMIN_FEATURE_KEY]: SaasAdminState } {
  return { [SAAS_ADMIN_FEATURE_KEY]: state };
}

describe('saas-admin selectors', () => {
  it('selectTenantsList returns the raw list', () => {
    const state = wrap({ ...initialSaasAdminState, tenants: [t({ id: 1 }), t({ id: 2 })] });
    expect(selectTenantsList(state)).toHaveLength(2);
  });

  it('split selectors filter by status/active/deleted', () => {
    const tenants = [
      t({ id: 1, status: 'ACTIVE',   active: true,  deletedAt: null }),
      t({ id: 2, status: 'INACTIVE', active: true,  deletedAt: null }),
      t({ id: 3, status: 'ACTIVE',   active: false, deletedAt: '2026-01-01' }),
    ];
    const state = wrap({ ...initialSaasAdminState, tenants });
    expect(selectActiveTenants(state).map((x) => x.id)).toEqual([1]);
    expect(selectInactiveTenants(state).map((x) => x.id)).toEqual([2]);
    expect(selectDeletedTenants(state).map((x) => x.id)).toEqual([3]);
  });

  it('selectDashboardCounts derives totals correctly', () => {
    const tenants = [
      t({ id: 1, status: 'ACTIVE',   active: true,  deletedAt: null }),
      t({ id: 2, status: 'ACTIVE',   active: true,  deletedAt: null }),
      t({ id: 3, status: 'INACTIVE', active: true,  deletedAt: null }),
      t({ id: 4, active: false, deletedAt: '2026-01-01' }),
    ];
    expect(selectDashboardCounts(wrap({ ...initialSaasAdminState, tenants }))).toEqual({
      total: 4, active: 2, inactive: 1, deleted: 1,
    });
  });
});
