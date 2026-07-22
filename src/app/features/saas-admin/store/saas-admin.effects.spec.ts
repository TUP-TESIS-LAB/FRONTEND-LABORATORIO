// src/app/features/saas-admin/store/saas-admin.effects.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, ReplaySubject, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '@core/services/notification.service';
import { SaasAdminApiService } from '../services/saas-admin-api.service';
import { SaasAdminEffects } from './saas-admin.effects';
import * as A from './saas-admin.actions';

describe('SaasAdminEffects', () => {
  let actions$: ReplaySubject<Action>;
  let api: Partial<Record<keyof SaasAdminApiService, ReturnType<typeof vi.fn>>>;
  let notification: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
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
      getTenantFiscalConfig: vi.fn(),
      upsertTenantFiscalConfig: vi.fn(),
      nbuCatalogSummary: vi.fn(),
      activateAllNbuCatalog: vi.fn(),
      deactivateAllNbuCatalog: vi.fn(),
    };
    notification = { success: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        SaasAdminEffects,
        provideMockActions(() => actions$),
        { provide: SaasAdminApiService, useValue: api },
        { provide: NotificationService, useValue: notification },
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

  it('createTenant$ → createTenantSuccess con CreateTenantResponse', async () => {
    const created = {
      id: 2, code: 'x', name: 'X', status: 'ACTIVE' as const, active: true, deletedAt: null,
      ownerFirstLoginToken: 'tok-xyz',
    };
    api.createTenant!.mockResolvedValue(created);
    actions$.next(A.createTenant({
      req: {
        code: 'x', name: 'X',
        ownerFirstName: 'Ana', ownerLastName: 'López',
        ownerEmail: 'ana@lab.com', ownerDocument: '30111222', ownerUsername: 'alopez',
      },
    }));
    const out = await expectEmits(effects.createTenant$);
    expect(out).toEqual(A.createTenantSuccess({ tenant: created }));
  });

  it('toggleTenantModule$ → toggleTenantModuleSuccess echoing the requested values', async () => {
    api.toggleTenantModule!.mockResolvedValue(undefined);
    actions$.next(A.toggleTenantModule({ tenantId: 1, code: 'PORTAL', enable: true }));
    const out = await expectEmits(effects.toggleTenantModule$);
    expect(out).toEqual(A.toggleTenantModuleSuccess({ tenantId: 1, code: 'PORTAL', enabled: true }));
  });

  it('toggleTenantModule$ → error → toast + toggleTenantModuleFailure', async () => {
    api.toggleTenantModule!.mockRejectedValue({ status: 403 });
    actions$.next(A.toggleTenantModule({ tenantId: 1, code: 'URGENCIAS', enable: false }));
    const out = await expectEmits(effects.toggleTenantModule$);
    expect(notification.error).toHaveBeenCalled();
    expect(out.type).toBe(A.toggleTenantModuleFailure.type);
  });

  it('softDeleteTenant$ → softDeleteTenantSuccess with the id', async () => {
    api.softDeleteTenant!.mockResolvedValue(undefined);
    actions$.next(A.softDeleteTenant({ id: 7 }));
    const out = await expectEmits(effects.softDeleteTenant$);
    expect(out).toEqual(A.softDeleteTenantSuccess({ id: 7 }));
  });

  it('createTenant$ emite createTenantFailure cuando el servicio rechaza', async () => {
    api.createTenant!.mockRejectedValue({ status: 409 });
    actions$.next(A.createTenant({
      req: {
        code: 'x', name: 'X',
        ownerFirstName: 'Ana', ownerLastName: 'López',
        ownerEmail: 'ana@lab.com', ownerDocument: '30111222', ownerUsername: 'alopez',
      },
    }));
    const out = await expectEmits(effects.createTenant$);
    expect(out.type).toBe(A.createTenantFailure.type);
  });

  it('loadTenantFiscalConfig$ → loadTenantFiscalConfigSuccess', async () => {
    const fiscalConfig = {
      targetTenantId: 1, provider: 'NONE' as const, invoicePointOfSale: null,
      razonSocial: null, cuit: null, ingresosBrutos: null, domicilioComercial: null,
      condicionIva: null, inicioActividades: null,
    };
    api.getTenantFiscalConfig!.mockResolvedValue(fiscalConfig);
    actions$.next(A.loadTenantFiscalConfig({ tenantId: 1 }));
    const out = await expectEmits(effects.loadTenantFiscalConfig$);
    expect(out).toEqual(A.loadTenantFiscalConfigSuccess({ fiscalConfig }));
  });

  it('upsertTenantFiscalConfig$ → upsertTenantFiscalConfigSuccess + toast de éxito', async () => {
    const fiscalConfig = {
      targetTenantId: 1, provider: 'NONE' as const, invoicePointOfSale: '0001',
      razonSocial: 'Demo SA', cuit: '20-12345678-9', ingresosBrutos: '901-1',
      domicilioComercial: 'Calle Falsa 123', condicionIva: 'RESPONSABLE_INSCRIPTO' as const,
      inicioActividades: '2020-01-01',
    };
    api.upsertTenantFiscalConfig!.mockResolvedValue(fiscalConfig);
    actions$.next(A.upsertTenantFiscalConfig({
      req: {
        targetTenantId: 1, provider: 'NONE', invoicePointOfSale: '0001',
        razonSocial: 'Demo SA', cuit: '20-12345678-9', ingresosBrutos: '901-1',
        domicilioComercial: 'Calle Falsa 123', condicionIva: 'RESPONSABLE_INSCRIPTO',
        inicioActividades: '2020-01-01',
      },
    }));
    const out = await expectEmits(effects.upsertTenantFiscalConfig$);
    expect(out).toEqual(A.upsertTenantFiscalConfigSuccess({ fiscalConfig }));
    expect(notification.success).toHaveBeenCalledWith('Identidad fiscal guardada');
  });

  it('upsertTenantFiscalConfig$ → 400 → toast específico de validación + failure', async () => {
    api.upsertTenantFiscalConfig!.mockRejectedValue(new HttpErrorResponse({ status: 400 }));
    actions$.next(A.upsertTenantFiscalConfig({
      req: {
        targetTenantId: 1, provider: 'NONE', invoicePointOfSale: null,
        razonSocial: null, cuit: 'invalido', ingresosBrutos: null,
        domicilioComercial: null, condicionIva: null, inicioActividades: null,
      },
    }));
    const out = await expectEmits(effects.upsertTenantFiscalConfig$);
    expect(out.type).toBe(A.upsertTenantFiscalConfigFailure.type);
    expect(notification.error).toHaveBeenCalledWith('Los datos fiscales son inválidos. Revisá el CUIT y la condición de IVA.');
  });

  it('upsertTenantFiscalConfig$ → error genérico → toast genérico + failure', async () => {
    api.upsertTenantFiscalConfig!.mockRejectedValue(new HttpErrorResponse({ status: 500 }));
    actions$.next(A.upsertTenantFiscalConfig({
      req: {
        targetTenantId: 1, provider: 'NONE', invoicePointOfSale: null,
        razonSocial: null, cuit: null, ingresosBrutos: null,
        domicilioComercial: null, condicionIva: null, inicioActividades: null,
      },
    }));
    const out = await expectEmits(effects.upsertTenantFiscalConfig$);
    expect(out.type).toBe(A.upsertTenantFiscalConfigFailure.type);
    expect(notification.error).toHaveBeenCalledWith('No se pudo guardar la identidad fiscal. Probá de nuevo.');
  });

  // --- Catálogo NBU (KAN-257) ---
  it('loadNbuCatalogSummary$ → loadNbuCatalogSummarySuccess', async () => {
    const summary = { activeCount: 12, catalogTotal: 1268 };
    api.nbuCatalogSummary!.mockResolvedValue(summary);
    actions$.next(A.loadNbuCatalogSummary({ tenantId: 1 }));
    const out = await expectEmits(effects.loadNbuCatalogSummary$);
    expect(out).toEqual(A.loadNbuCatalogSummarySuccess({ summary }));
  });

  it('activateAllNbuCatalog$ → success + toast con el conteo', async () => {
    api.activateAllNbuCatalog!.mockResolvedValue({ count: 1256 });
    actions$.next(A.activateAllNbuCatalog({ tenantId: 1 }));
    const out = await expectEmits(effects.activateAllNbuCatalog$);
    expect(out).toEqual(A.activateAllNbuCatalogSuccess({ tenantId: 1, count: 1256 }));
    expect(notification.success).toHaveBeenCalledWith('Se activaron 1256 análisis del catálogo.');
  });

  it('activateAllNbuCatalog$ → error → toast + failure', async () => {
    api.activateAllNbuCatalog!.mockRejectedValue({ status: 500 });
    actions$.next(A.activateAllNbuCatalog({ tenantId: 1 }));
    const out = await expectEmits(effects.activateAllNbuCatalog$);
    expect(out.type).toBe(A.activateAllNbuCatalogFailure.type);
    expect(notification.error).toHaveBeenCalled();
  });

  it('deactivateAllNbuCatalog$ → success + toast con el conteo', async () => {
    api.deactivateAllNbuCatalog!.mockResolvedValue({ count: 30 });
    actions$.next(A.deactivateAllNbuCatalog({ tenantId: 1 }));
    const out = await expectEmits(effects.deactivateAllNbuCatalog$);
    expect(out).toEqual(A.deactivateAllNbuCatalogSuccess({ tenantId: 1, count: 30 }));
    expect(notification.success).toHaveBeenCalledWith('Se desactivaron 30 análisis del catálogo.');
  });

  it('refreshNbuSummaryAfterBulk$ → recarga el resumen tras activar', async () => {
    actions$.next(A.activateAllNbuCatalogSuccess({ tenantId: 5, count: 3 }));
    const out = await expectEmits(effects.refreshNbuSummaryAfterBulk$);
    expect(out).toEqual(A.loadNbuCatalogSummary({ tenantId: 5 }));
  });
});
