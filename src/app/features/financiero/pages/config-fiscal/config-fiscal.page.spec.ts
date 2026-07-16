import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ConfigFiscalPage } from './config-fiscal.page';
import { TokenService } from '@core/auth/token.service';
import {
  selectFiscalConfig,
  selectFiscalSaving,
} from '../../store/financiero.selectors';
import { TenantFiscalConfig } from '../../models/financiero.model';

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  });
}

const MOCK_TOKEN_SERVICE = {
  getTenantId: () => '42',
  getRoles: () => ['SAAS_ADMIN'],
};

const ARCA_CONFIG: TenantFiscalConfig & { configJson: string } = {
  id: 1,
  targetTenantId: 42,
  provider: 'ARCA',
  invoicePointOfSale: '0003',
  active: true,
  configJson: JSON.stringify({ cuit: '30-12345678-9', cert: 'cert.pem', ambiente: 'Producción' }),
};

const COLPPY_CONFIG: TenantFiscalConfig & { configJson: string } = {
  id: 2,
  targetTenantId: 42,
  provider: 'COLPPY',
  invoicePointOfSale: '0007',
  active: true,
  configJson: JSON.stringify({ apiKey: 'clpy_live_abc', usuario: 'integracion@lab.com' }),
};

/**
 * Prueba de prefill reactivo de ConfigFiscalPage.
 *
 * El fix (KAN-task-9 final review Fix 2) usa effect() en el injection context
 * para seedear el formulario cuando el store resuelve existingConfig().
 *
 * Usa overrideTemplate para evitar NG0950 de input.required() en vitest.
 */
describe('ConfigFiscalPage — prefill reactivo desde el store', () => {
  const minimalTemplate = `
    <div class="fin-config">
      <div data-testid="provider">{{ selectedProvider() }}</div>
      <div data-testid="pventa">{{ invoicePointOfSale }}</div>
      <div data-testid="cuit">{{ arcaCreds.cuit }}</div>
      <div data-testid="colppy-key">{{ colppyCreds.apiKey }}</div>
    </div>
  `;

  beforeEach(async () => {
    installLocalStorageMock();

    await TestBed.configureTestingModule({
      imports: [ConfigFiscalPage],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          selectors: [
            { selector: selectFiscalConfig, value: null },
            { selector: selectFiscalSaving,  value: false },
          ],
        }),
        { provide: TokenService, useValue: MOCK_TOKEN_SERVICE },
      ],
    })
      .overrideTemplate(ConfigFiscalPage, minimalTemplate)
      .compileComponents();
  });

  it('empieza en NONE cuando el store no tiene config', () => {
    const fixture = TestBed.createComponent(ConfigFiscalPage);
    fixture.detectChanges();

    const comp = fixture.componentInstance as any;
    expect(comp.selectedProvider()).toBe('NONE');
    expect(comp.invoicePointOfSale).toBe('');
  });

  it('prefilla provider + invoicePointOfSale + credenciales ARCA cuando el store carga', () => {
    // Start with ARCA config already in the store (simulates async load completing)
    const mockStore = TestBed.inject(MockStore);
    mockStore.overrideSelector(selectFiscalConfig, ARCA_CONFIG as any);
    mockStore.refreshState();

    const fixture = TestBed.createComponent(ConfigFiscalPage);
    fixture.detectChanges();

    const comp = fixture.componentInstance as any;
    expect(comp.selectedProvider()).toBe('ARCA');
    expect(comp.invoicePointOfSale).toBe('0003');
    expect(comp.arcaCreds.cuit).toBe('30-12345678-9');
    expect(comp.arcaCreds.cert).toBe('cert.pem');
    expect(comp.arcaCreds.ambiente).toBe('Producción');
  });

  it('prefilla provider + credenciales COLPPY cuando el store carga', () => {
    const mockStore = TestBed.inject(MockStore);
    mockStore.overrideSelector(selectFiscalConfig, COLPPY_CONFIG as any);
    mockStore.refreshState();

    const fixture = TestBed.createComponent(ConfigFiscalPage);
    fixture.detectChanges();

    const comp = fixture.componentInstance as any;
    expect(comp.selectedProvider()).toBe('COLPPY');
    expect(comp.invoicePointOfSale).toBe('0007');
    expect(comp.colppyCreds.apiKey).toBe('clpy_live_abc');
    expect(comp.colppyCreds.usuario).toBe('integracion@lab.com');
  });

  it('el effect() seedea el form cuando el store cambia de null a config', () => {
    // Start null, then flip to ARCA config after component creation
    const mockStore = TestBed.inject(MockStore);

    const fixture = TestBed.createComponent(ConfigFiscalPage);
    fixture.detectChanges();

    const comp = fixture.componentInstance as any;
    // Initially NONE
    expect(comp.selectedProvider()).toBe('NONE');

    // Store resolves (simulates HTTP response arriving)
    mockStore.overrideSelector(selectFiscalConfig, ARCA_CONFIG as any);
    mockStore.refreshState();
    fixture.detectChanges();

    expect(comp.selectedProvider()).toBe('ARCA');
    expect(comp.invoicePointOfSale).toBe('0003');
    expect(comp.arcaCreds.cuit).toBe('30-12345678-9');
  });

  it('discard() restaura los campos al valor del store', () => {
    const mockStore = TestBed.inject(MockStore);
    mockStore.overrideSelector(selectFiscalConfig, ARCA_CONFIG as any);
    mockStore.refreshState();

    const fixture = TestBed.createComponent(ConfigFiscalPage);
    fixture.detectChanges();

    const comp = fixture.componentInstance as any;

    // Simulate user edit
    comp.selectedProvider.set('NONE');
    comp.invoicePointOfSale = '';
    fixture.detectChanges();

    // discard() should restore to the saved state
    comp.discard();
    fixture.detectChanges();

    expect(comp.selectedProvider()).toBe('ARCA');
    expect(comp.invoicePointOfSale).toBe('0003');
  });
});
