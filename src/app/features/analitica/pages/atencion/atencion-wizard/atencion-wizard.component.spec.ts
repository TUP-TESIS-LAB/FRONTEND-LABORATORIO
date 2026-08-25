import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject, of } from 'rxjs';
import { AtencionWizardComponent } from './atencion-wizard.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { DoctorService } from '@features/medicos/services/doctor.service';
import { CoveragePlansService } from '@features/pacientes/services/coverage-plans.service';
import { NotificationService } from '@core/services/notification.service';
import { AttentionResponse, AttentionState } from '../../../models/atencion.model';
import { ModuleKey } from '@core/models/module-key.enum';
import {
  selectDetail, selectDetailLoading, selectMutating,
  selectResolvedPatient, selectPatientResolving, selectPatientNotFoundDni,
  selectPatientResolutionError, selectPricing, selectPricingLoading, selectCopaymentMutating,
} from '../../../store/atencion/atencion.selectors';
import { addPayment, cancelAtencion, downloadProtocolLabels, endCollection, resetAtencionWizard, returnPhase } from '../../../store/atencion/atencion.actions';

function makeDetail(state: AttentionState): AttentionResponse {
  return {
    id: 1, tenantId: 1, attentionNumber: 'A-001', publicCode: null, patientId: 100,
    doctorId: null, branchId: 1, insurancePlanId: null, indications: null,
    paymentId: null, protocolId: null, extractorId: null, attentionBox: null,
    deskAttentionBox: null, prescriptionFileUrl: null, isUrgent: false,
    authorizationNumber: null, observations: null, cancellationReason: null,
    cancelledAtState: null, attentionState: state, mostAdvancedState: state,
    analysisAuthorizations: [], copaymentAmount: null,
  };
}

describe('AtencionWizardComponent (CORE flow)', () => {
  let fixture: ComponentFixture<AtencionWizardComponent>;
  let registry: { isActive: ReturnType<typeof vi.fn> };

  function setup(state: AttentionState, financieroActive = false) {
    registry = { isActive: vi.fn().mockReturnValue(financieroActive) }; // Financiero OFF por default
    TestBed.configureTestingModule({
      imports: [AtencionWizardComponent],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectDetail, value: makeDetail(state) },
            { selector: selectDetailLoading, value: false },
            { selector: selectMutating, value: false },
            // El paso 1 (datos-generales-step) lee estos selectors al renderizar.
            { selector: selectResolvedPatient, value: null },
            { selector: selectPatientResolving, value: false },
            { selector: selectPatientNotFoundDni, value: null },
            { selector: selectPatientResolutionError, value: null },
            // Pricing selectors (resumen-step, Paso 3)
            { selector: selectPricing, value: null },
            { selector: selectPricingLoading, value: false },
            { selector: selectCopaymentMutating, value: false },
          ],
        }),
        // El wizard renderiza step components que ahora inyectan Actions
        // para esperar atencionMutationSuccess (FE-13/FE-14). Necesitan
        // un stream mock o falla la DI con NG0201.
        provideMockActions(() => new ReplaySubject<Action>(1)),
        { provide: ModuleRegistry, useValue: registry },
        { provide: Router, useValue: { navigate: vi.fn() } },
        // DatosGeneralesStep ahora lee el dni del queryParam (KAN-73).
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        // Steps inyectan estos servicios (HTTP). Stubeamos para no requerir HttpClient.
        // resumen-step ahora resuelve el médico solicitante por id (NEW-A).
        { provide: DoctorService, useValue: { list: () => of([]), getById: () => of(null), quickCreate: vi.fn() } },
        { provide: CoveragePlansService, useValue: { getActivePlans: () => of([]) } },
        { provide: NotificationService, useValue: { error: vi.fn(), success: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(AtencionWizardComponent);
    fixture.detectChanges();
  }

  it('CORE: visibleSteps excludes cobro/facturacion when Financiero OFF', () => {
    setup(AttentionState.REGISTERING_GENERAL_DATA);
    const keys = (fixture.componentInstance as any).visibleSteps().map((s: any) => s.key);
    expect(keys).toEqual(['datos', 'analisis', 'confirmar']);
  });

  it('CORE: onAnalysisAdvanced jumps to the next visible step (confirmar) when Financiero OFF', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    fixture.componentInstance.onAnalysisAdvanced();
    fixture.detectChanges();
    expect((fixture.componentInstance as any).uiStep().key).toBe('confirmar');
  });

  // ── Cobro (FINANCIERO activo): entrada a ON_COLLECTION + avance a facturación ──
  it('con FINANCIERO activo, onAnalysisAdvanced entra a cobro y despacha addPayment(null)', () => {
    setup(AttentionState.REGISTERING_ANALYSES, true);
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onAnalysisAdvanced();
    fixture.detectChanges();
    // El backend (REGISTERING_ANALYSES) entra a la fase de cobro vía addPayment con paymentId null.
    expect(spy).toHaveBeenCalledWith(addPayment({ id: 1, payload: { paymentId: null } }));
    expect((fixture.componentInstance as any).uiStep().key).toBe('cobro');
  });

  it('advanceCurrent en el paso cobro despacha endCollection y limpia el override', () => {
    setup(AttentionState.ON_COLLECTION_PROCESS, true);
    // Simulamos el override que dejó onAnalysisAdvanced.
    (fixture.componentInstance as any).uiStepOverride.set('cobro');
    fixture.detectChanges();
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    (fixture.componentInstance as any).advanceCurrent();
    expect(spy).toHaveBeenCalledWith(endCollection({ id: 1 }));
    // Override limpio → el wizard sigue el estado real hacia 'facturación'.
    expect((fixture.componentInstance as any).uiStepOverride()).toBeNull();
  });

  it('onCancelConfirmed despacha cancelAtencion con el motivo', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onCancelConfirmed('Error de carga');
    expect(spy).toHaveBeenCalledWith(cancelAtencion({ id: 1, payload: { cancellationReason: 'Error de carga' } }));
  });

  it('onFinished despacha resetAtencionWizard y navega a Recepción', () => {
    setup(AttentionState.AWAITING_CONFIRMATION);
    const store = TestBed.inject(MockStore);
    const router = TestBed.inject(Router);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const navigateSpy = router.navigate as ReturnType<typeof vi.fn>;
    fixture.componentInstance.onFinished();
    expect(dispatchSpy).toHaveBeenCalledWith(resetAtencionWizard());
    expect(navigateSpy).toHaveBeenCalledWith(['/turnos/recepcion']);
  });

  it('onReturnPhase con uiStepOverride activo limpia el override y NO despacha returnPhase', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    const store = TestBed.inject(MockStore);
    // Avanzamos por UI (override) sin tocar el backend: estamos en "analisis"
    // (REGISTERING_ANALYSES) y la UI nos muestra "confirmar".
    fixture.componentInstance.onAnalysisAdvanced();
    fixture.detectChanges();
    expect((fixture.componentInstance as any).uiStepOverride()).toBe('confirmar');
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onReturnPhase();
    // El override quedó limpio → volvemos al paso real del backend.
    expect((fixture.componentInstance as any).uiStepOverride()).toBeNull();
    // Y NO retrocedimos el estado del backend.
    expect(spy).not.toHaveBeenCalledWith(returnPhase({ id: 1 }));
  });

  it('onReturnPhase sin override despacha returnPhase', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    const store = TestBed.inject(MockStore);
    expect((fixture.componentInstance as any).uiStepOverride()).toBeNull();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onReturnPhase();
    expect(spy).toHaveBeenCalledWith(returnPhase({ id: 1 }));
  });

  it('downloadLabels despacha downloadProtocolLabels cuando hay protocolId', () => {
    setup(AttentionState.AWAITING_EXTRACTION);
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectDetail, { ...makeDetail(AttentionState.AWAITING_EXTRACTION), protocolId: 9 } as any);
    store.refreshState();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.downloadLabels();
    expect(spy).toHaveBeenCalledWith(downloadProtocolLabels({ protocolId: 9, protocolNumber: 'P-9' }));
  });

  // ── NEW-C: completedSteps marca verdes los pasos anteriores al VISIBLE ─────
  it('NEW-C: al ver el Paso 3 vía override, completedSteps marca 0 y 1 como completados', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    // Backend en analisis (idx 1); avanzamos por UI al confirmar (idx 2).
    fixture.componentInstance.onAnalysisAdvanced();
    fixture.detectChanges();
    const completed = (fixture.componentInstance as any).completedSteps() as ReadonlySet<number>;
    expect(completed.has(0)).toBe(true);
    expect(completed.has(1)).toBe(true);
    expect(completed.has(2)).toBe(false);
  });

  it('NEW-C: al volver fase (limpiar override) completedSteps cae al paso real', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    fixture.componentInstance.onAnalysisAdvanced();
    fixture.detectChanges();
    fixture.componentInstance.onReturnPhase();
    fixture.detectChanges();
    // Paso real = analisis (idx 1) → solo el 0 queda completado.
    const completed = (fixture.componentInstance as any).completedSteps() as ReadonlySet<number>;
    expect(completed.has(0)).toBe(true);
    expect(completed.has(1)).toBe(false);
  });

  // ── C2: el tag URGENTE vive centrado en el footer del wizard ────────────────
  it('C2: con isUrgent el footer muestra el tag URGENTE', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectDetail, { ...makeDetail(AttentionState.REGISTERING_ANALYSES), isUrgent: true } as any);
    store.refreshState();
    fixture.detectChanges();
    const footer = fixture.nativeElement.querySelector('footer') as HTMLElement;
    expect(footer.textContent).toContain('URGENTE');
  });

  it('C2: sin isUrgent el footer NO muestra el tag URGENTE', () => {
    setup(AttentionState.REGISTERING_ANALYSES); // makeDetail → isUrgent: false
    const footer = fixture.nativeElement.querySelector('footer') as HTMLElement;
    expect(footer.textContent).not.toContain('URGENTE');
  });

  // ── NEW-D: Volver al listado ───────────────────────────────────────────────
  it('NEW-D: backToList navega a /turnos/recepcion', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    const router = TestBed.inject(Router);
    const navigateSpy = router.navigate as ReturnType<typeof vi.fn>;
    fixture.componentInstance.backToList();
    expect(navigateSpy).toHaveBeenCalledWith(['/turnos/recepcion']);
  });

  it('NEW-D: el botón "Volver al listado" se renderiza en el footer', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    const el: HTMLElement = fixture.nativeElement;
    const btn = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Volver al listado'));
    expect(btn).toBeTruthy();
  });

  // ── NEW-E: solo-lectura para estados terminales / post-secretaría ──────────
  it('NEW-E: readOnly es true para estado terminal (FINISHED) y oculta Cancelar', () => {
    setup(AttentionState.FINISHED);
    expect((fixture.componentInstance as any).readOnly()).toBe(true);
    expect((fixture.componentInstance as any).canCancel()).toBe(false);
    const el: HTMLElement = fixture.nativeElement;
    const cancel = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Cancelar atención'));
    expect(cancel).toBeUndefined();
  });

  it('NEW-E: readOnly es true en post-secretaría (AWAITING_EXTRACTION)', () => {
    setup(AttentionState.AWAITING_EXTRACTION);
    expect((fixture.componentInstance as any).readOnly()).toBe(true);
  });

  it('NEW-E: readOnly es false en un estado activo (REGISTERING_ANALYSES)', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    expect((fixture.componentInstance as any).readOnly()).toBe(false);
  });

  it('NEW-E: en solo-lectura el stepper muestra el primer paso por defecto y goToStep navega', () => {
    setup(AttentionState.FINISHED);
    // stepFromState es null para terminal → uiStep cae al primer paso (datos, idx 0).
    expect((fixture.componentInstance as any).activeIndex()).toBe(0);
    (fixture.componentInstance as any).goToStep(2);
    fixture.detectChanges();
    expect((fixture.componentInstance as any).uiStep().key).toBe('confirmar');
  });

  // ── KAN-140: modo express urgente ─────────────────────────────────────────

  it('KAN-140: con urgente + Urgencias activo, visibleSteps excluye cobro/facturacion/confirmar', () => {
    // Urgencias activo, Financiero inactivo
    setup(AttentionState.REGISTERING_ANALYSES);
    registry.isActive.mockImplementation((key: string) => key === ModuleKey.Urgencias);
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectDetail, { ...makeDetail(AttentionState.REGISTERING_ANALYSES), isUrgent: true } as any);
    store.refreshState();
    fixture.detectChanges();
    const keys = (fixture.componentInstance as any).visibleSteps().map((s: any) => s.key);
    expect(keys).toEqual(['datos', 'analisis']);
  });

  it('KAN-140: sin urgente (isUrgent=false) NO filtra pasos extra aunque Urgencias esté activo', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    registry.isActive.mockImplementation((key: string) => key === ModuleKey.Urgencias);
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectDetail, { ...makeDetail(AttentionState.REGISTERING_ANALYSES), isUrgent: false } as any);
    store.refreshState();
    fixture.detectChanges();
    const keys = (fixture.componentInstance as any).visibleSteps().map((s: any) => s.key);
    // Sin Financiero y sin modo express: [datos, analisis, confirmar]
    expect(keys).toEqual(['datos', 'analisis', 'confirmar']);
  });

  // ── KAN-140: badges de pendientes ─────────────────────────────────────────

  it('KAN-140: badge "Cobro pendiente" se muestra cuando cobroPendiente=true', () => {
    setup(AttentionState.AWAITING_EXTRACTION);
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectDetail, { ...makeDetail(AttentionState.AWAITING_EXTRACTION), isUrgent: true, cobroPendiente: true } as any);
    store.refreshState();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Cobro pendiente');
  });

  it('KAN-140: badge "Autorización pendiente" se muestra cuando autorizacionPendiente=true', () => {
    setup(AttentionState.AWAITING_EXTRACTION);
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectDetail, { ...makeDetail(AttentionState.AWAITING_EXTRACTION), isUrgent: true, autorizacionPendiente: true } as any);
    store.refreshState();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Autorización pendiente');
  });

  it('KAN-140: badge "Datos incompletos" se muestra cuando datosAdministrativosIncompletos=true', () => {
    setup(AttentionState.AWAITING_EXTRACTION);
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectDetail, { ...makeDetail(AttentionState.AWAITING_EXTRACTION), isUrgent: true, datosAdministrativosIncompletos: true } as any);
    store.refreshState();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Datos incompletos');
  });

  it('KAN-140: badges NO se muestran cuando los flags son false o ausentes', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Cobro pendiente');
    expect(text).not.toContain('Autorización pendiente');
    expect(text).not.toContain('Datos incompletos');
  });
});
