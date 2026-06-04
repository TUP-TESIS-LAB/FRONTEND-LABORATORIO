import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject, of } from 'rxjs';
import { AtencionWizardComponent } from './atencion-wizard.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { NbuService } from '../../../services/nbu.service';
import { AttentionResponse, AttentionState } from '../../../models/atencion.model';
import {
  selectDetail, selectDetailLoading, selectMutating,
  selectResolvedPatient, selectPatientResolving, selectPatientNotFoundDni,
  selectPatientResolutionError,
} from '../../../store/atencion/atencion.selectors';

function makeDetail(state: AttentionState): AttentionResponse {
  return {
    id: 1, tenantId: 1, attentionNumber: 'A-001', patientId: 100,
    doctorId: null, branchId: 1, insurancePlanId: null, indications: null,
    paymentId: null, protocolId: null, extractorId: null, attentionBox: null,
    deskAttentionBox: null, prescriptionFileUrl: null, isUrgent: false,
    authorizationNumber: null, observations: null, cancellationReason: null,
    cancelledAtState: null, attentionState: state, mostAdvancedState: state,
    analysisAuthorizations: [],
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
          ],
        }),
        // El wizard renderiza step components que ahora inyectan Actions
        // para esperar atencionMutationSuccess (FE-13/FE-14). Necesitan
        // un stream mock o falla la DI con NG0201.
        provideMockActions(() => new ReplaySubject<Action>(1)),
        { provide: ModuleRegistry, useValue: registry },
        { provide: NbuService, useValue: { getCurrent: vi.fn().mockReturnValue(of(null)) } },
        { provide: Router, useValue: { navigate: vi.fn() } },
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
});
