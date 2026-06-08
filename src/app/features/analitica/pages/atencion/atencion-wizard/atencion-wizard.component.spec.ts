import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject } from 'rxjs';
import { AtencionWizardComponent } from './atencion-wizard.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { AttentionResponse, AttentionState } from '../../../models/atencion.model';
import {
  selectDetail, selectDetailLoading, selectMutating,
  selectResolvedPatient, selectPatientResolving, selectPatientNotFoundDni,
  selectPatientResolutionError, selectPricing, selectPricingLoading, selectCopaymentMutating,
} from '../../../store/atencion/atencion.selectors';
import { cancelAtencion, downloadProtocolLabels, resetAtencionWizard, returnPhase } from '../../../store/atencion/atencion.actions';

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

  function setup(state: AttentionState) {
    registry = { isActive: vi.fn().mockReturnValue(false) }; // Financiero OFF
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
});
