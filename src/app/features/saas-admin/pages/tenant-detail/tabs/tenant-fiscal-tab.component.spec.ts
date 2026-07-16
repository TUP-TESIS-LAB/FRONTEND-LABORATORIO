import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Action } from '@ngrx/store';
import { ReplaySubject } from 'rxjs';
import { TenantFiscalTabComponent } from './tenant-fiscal-tab.component';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../../store/saas-admin.state';
import { upsertTenantFiscalConfigSuccess } from '../../../store/saas-admin.actions';

/**
 * El contrato de merge de los 6 campos de identidad se testea en
 * `models/tenant-fiscal-config.model.spec.ts`, sobre `buildFiscalConfigRequest`.
 *
 * No se testea acá porque `componentRef.setInput()` no llega a los signal inputs
 * (`input.required()`) bajo el setup de Vitest de este repo: el set falla con NG0303 y la
 * lectura posterior revienta con NG0950. Los specs de `tenant-white-label-tab` y
 * `tenant-modules-tab` ya fallan por lo mismo en `development`. Es deuda del test infra,
 * ajena a este cambio — pero el contrato de merge es demasiado importante para dejarlo
 * sin cubrir, así que vive en una función pura testeable sin TestBed.
 */
describe('TenantFiscalTabComponent', () => {
  let actions$: ReplaySubject<Action>;

  beforeEach(() => {
    actions$ = new ReplaySubject(1);
    TestBed.configureTestingModule({
      imports: [TenantFiscalTabComponent],
      providers: [
        provideMockStore({
          initialState: {
            [SAAS_ADMIN_FEATURE_KEY]: {
              ...initialSaasAdminState,
              selectedTenantFiscalConfig: {
                targetTenantId: 1, provider: 'NONE', invoicePointOfSale: '0001',
                razonSocial: 'Demo SA', cuit: '20-12345678-9', ingresosBrutos: '901-1',
                domicilioComercial: 'Calle Falsa 123', condicionIva: 'RESPONSABLE_INSCRIPTO',
                inicioActividades: '2020-01-01',
                arcaEnvironment: null, arcaIvaPercentage: null, arcaCredentialsConfigured: false,
              },
            },
          },
        }),
        provideMockActions(() => actions$),
        provideNoopAnimations(),
      ],
    });
  });

  it('hidrata el form desde la config fiscal cargada', () => {
    const fixture = TestBed.createComponent(TenantFiscalTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.get('razonSocial')!.value).toBe('Demo SA');
    expect(fixture.componentInstance.form.get('cuit')!.value).toBe('20-12345678-9');
    expect(fixture.componentInstance.form.get('condicionIva')!.value).toBe('RESPONSABLE_INSCRIPTO');
  });

  it('con CUIT inválido no despacha', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantFiscalTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();

    fixture.componentInstance.form.patchValue({ cuit: '123-invalid' });
    fixture.componentInstance.form.markAsDirty();
    fixture.componentInstance.save();

    expect(spy).not.toHaveBeenCalled();
  });

  // Hallazgo #4 (review Pertusati): `save()` no tenía guard de `form.pristine`, a diferencia
  // del hermano `tenant-white-label-tab`.
  it('con el form pristine no despacha aunque sería válido', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantFiscalTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.pristine).toBe(true);
    fixture.componentInstance.save();

    expect(spy).not.toHaveBeenCalled();
  });

  // Hallazgo #2 (segunda parte): antes `save()` marcaba pristine SINCRÓNICAMENTE al
  // dispatchear, sin esperar la respuesta — un submit todavía en vuelo (o rechazado) dejaba el
  // form falsamente "limpio" y habilitaba al effect de hidratación a pisar lo tipeado. Ahora
  // solo se marca pristine cuando llega `upsertTenantFiscalConfigSuccess`.
  //
  // No pasa por `save()` a propósito: `componentRef.setInput()` no llega a los signal inputs
  // (`input.required()`) bajo el setup de Vitest de este repo (NG0303/NG0950, ver comentario
  // del describe), así que `save()` revienta al leer `this.tenantId()` sin importar el input
  // seteado. El comportamiento bajo prueba acá es la suscripción a `Actions`, que no depende
  // de `tenantId()` — se dirtea el form directamente para simular "el usuario editó algo".
  it('no marca el form pristine hasta que llega upsertTenantFiscalConfigSuccess', () => {
    const fixture = TestBed.createComponent(TenantFiscalTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();

    fixture.componentInstance.form.patchValue({ razonSocial: 'Nueva razón social' });
    fixture.componentInstance.form.markAsDirty();

    expect(fixture.componentInstance.form.pristine).toBe(false);

    actions$.next(upsertTenantFiscalConfigSuccess({
      fiscalConfig: {
        targetTenantId: 1, provider: 'NONE', invoicePointOfSale: '0001',
        razonSocial: 'Nueva razón social', cuit: '20-12345678-9', ingresosBrutos: '901-1',
        domicilioComercial: 'Calle Falsa 123', condicionIva: 'RESPONSABLE_INSCRIPTO',
        inicioActividades: '2020-01-01',
        arcaEnvironment: null, arcaIvaPercentage: null, arcaCredentialsConfigured: false,
      },
    }));

    expect(fixture.componentInstance.form.pristine).toBe(true);
  });
});
