import { HttpErrorResponse } from '@angular/common/http';
import { tenantReducer } from './store/tenant.reducer';
import { initialTenantState } from './store/tenant.state';
import {
  loadTenantConfig,
  loadTenantConfigSuccess,
  loadTenantConfigFailure,
} from './store/tenant.actions';
import { ModuleKey } from '@core/models/module-key.enum';
import { TenantConfig } from '@core/models/tenant.model';

const MOCK_CONFIG: TenantConfig = {
  id: 'lab1',
  name: 'Laboratorio Central',
  logoUrl: '/logo.png',
  brandPrimary: '#2563eb',
  brandSecondary: '#0ea5a4',
  brandAccent: '#f97316',
  modules: [ModuleKey.Turnos, ModuleKey.Financiero],
};

describe('tenantReducer', () => {
  it('should start with null config and pending false', () => {
    const state = tenantReducer(undefined, { type: '@@init' });
    expect(state.config).toBeNull();
    expect(state.pending).toBe(false);
    expect(state.error).toBeNull();
  });

  it('loadTenantConfig sets pending true', () => {
    const state = tenantReducer(initialTenantState, loadTenantConfig());
    expect(state.pending).toBe(true);
    expect(state.error).toBeNull();
  });

  it('loadTenantConfigSuccess stores config and clears pending', () => {
    const pending = tenantReducer(initialTenantState, loadTenantConfig());
    const state = tenantReducer(pending, loadTenantConfigSuccess({ config: MOCK_CONFIG }));
    expect(state.config).toEqual(MOCK_CONFIG);
    expect(state.pending).toBe(false);
    expect(state.error).toBeNull();
  });

  it('loadTenantConfigFailure stores error and clears pending', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const pending = tenantReducer(initialTenantState, loadTenantConfig());
    const state = tenantReducer(pending, loadTenantConfigFailure({ error }));
    expect(state.config).toBeNull();
    expect(state.pending).toBe(false);
    expect(state.error).toBe(error);
  });
});
