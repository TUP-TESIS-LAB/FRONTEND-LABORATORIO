import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TenantStore } from './tenant.store';
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

describe('TenantStore', () => {
  let store: InstanceType<typeof TenantStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TenantStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(TenantStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should start with null config', () => {
    expect(store.config()).toBeNull();
    expect(store.loading()).toBe(false);
  });

  it('should load config and expose it', () => {
    store.loadConfig();
    expect(store.loading()).toBe(true);
    http.expectOne('/api/tenant/config').flush(MOCK_CONFIG);
    expect(store.config()).toEqual(MOCK_CONFIG);
    expect(store.loading()).toBe(false);
  });

  it('isActive returns true for active module', () => {
    store.loadConfig();
    http.expectOne('/api/tenant/config').flush(MOCK_CONFIG);
    expect(store.isActive(ModuleKey.Turnos)).toBe(true);
  });

  it('isActive returns false for inactive module', () => {
    store.loadConfig();
    http.expectOne('/api/tenant/config').flush(MOCK_CONFIG);
    expect(store.isActive(ModuleKey.Medicos)).toBe(false);
  });
});
