import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { ReplaySubject } from 'rxjs';
import { ResumenStepComponent } from './resumen-step.component';
import { ATENCION_FEATURE_KEY, initialAtencionState } from '../../../../../store/atencion/atencion.state';
import {
  loadAttentionAnalyses,
  loadAttentionPatient,
  endSecretaryPhase,
  atencionMutationSuccess,
  atencionMutationFailure,
} from '../../../../../store/atencion/atencion.actions';
import { AttentionState } from '../../../../../models/atencion.model';
import { readAtencionSession, writeAtencionSession } from '../../../../../utils/atencion-session-store';

// ─── helpers ────────────────────────────────────────────────────────────────

function attn(): any {
  return {
    id: 42, patientId: 5, isUrgent: false, indications: null,
    analysisAuthorizations: [{ id: 1, analysisId: 3, isAuthorized: true, active: true }],
  };
}

function fullAttn(): any {
  return {
    id: 42, tenantId: 1, attentionNumber: 'A-042', patientId: 100,
    doctorId: null, branchId: 1, insurancePlanId: null, indications: 'Ayuno',
    paymentId: null, protocolId: null, extractorId: null, attentionBox: null,
    deskAttentionBox: null, prescriptionFileUrl: null, isUrgent: true,
    authorizationNumber: null, observations: null, cancellationReason: null,
    cancelledAtState: null, attentionState: AttentionState.AWAITING_CONFIRMATION,
    mostAdvancedState: AttentionState.AWAITING_CONFIRMATION, analysisAuthorizations: [],
  };
}

const SEEDED_STATE = {
  [ATENCION_FEATURE_KEY]: {
    ...initialAtencionState,
    resolvedPatient: { id: 5, dni: '18901234', firstName: 'Tute', lastName: 'Gaymer' } as any,
    summaryAnalyses: [{ id: 3, shortCode: 'BIO001', name: 'Hemograma', familyName: null, ubCount: null }],
  },
};

// ─── suite ──────────────────────────────────────────────────────────────────

describe('ResumenStepComponent', () => {
  let store: MockStore;
  let actions$: ReplaySubject<Action>;

  beforeEach(async () => {
    sessionStorage.clear();
    actions$ = new ReplaySubject<Action>(1);

    await TestBed.configureTestingModule({
      imports: [ResumenStepComponent],
      providers: [
        provideMockStore({ initialState: SEEDED_STATE }),
        provideMockActions(() => actions$),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
  });

  // ── nuevos tests: carga de datos ─────────────────────────────────────────

  it('despacha loadAttentionAnalyses en init y NO loadAttentionPatient si ya está resuelto', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', attn());
    f.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadAttentionAnalyses({ analysisIds: [3] }));
    expect(spy).not.toHaveBeenCalledWith(loadAttentionPatient({ patientId: 5 }));
  });

  it('muestra apellido, nombre, dni y el nombre del análisis', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', attn());
    f.detectChanges();
    const text = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Gaymer, Tute');
    expect(text).toContain('18901234');
    expect(text).toContain('Hemograma');
  });

  // ── tests restaurados: flujo finalizar (contrato pessimistic-UI) ─────────

  it('onFinishWithTicket dispatches endSecretaryPhase', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', fullAttn());
    f.detectChanges();
    const dispatched: any[] = [];
    (f.componentInstance as any)['store'].dispatch = vi.fn().mockImplementation((x: any) => dispatched.push(x));
    f.componentInstance.onFinishWithTicket(false);
    expect(dispatched[0].type).toBe(endSecretaryPhase.type);
  });

  it('opens ticket modal when openFinalize is called', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', fullAttn());
    f.detectChanges();
    expect(f.componentInstance.ticketModalOpen()).toBe(false);
    f.componentInstance.openFinalize();
    expect(f.componentInstance.ticketModalOpen()).toBe(true);
  });

  it('emits finished + clears session ONLY after atencionMutationSuccess', () => {
    writeAtencionSession({ atencionId: 42, uiStep: 'confirmar' });
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', fullAttn());
    f.detectChanges();
    let finished = false;
    f.componentInstance.finished.subscribe(() => (finished = true));
    f.componentInstance.onFinishWithTicket(false);
    // Before success: wizard stays open
    expect(finished).toBe(false);
    expect(readAtencionSession()).not.toBeNull();
    // Success arrives → finish
    actions$.next(atencionMutationSuccess({ item: {} as any }));
    expect(finished).toBe(true);
    expect(readAtencionSession()).toBeNull();
  });

  it('does NOT emit finished / clear session when mutation fails', () => {
    writeAtencionSession({ atencionId: 42, uiStep: 'confirmar' });
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', fullAttn());
    f.detectChanges();
    let finished = false;
    f.componentInstance.finished.subscribe(() => (finished = true));
    f.componentInstance.onFinishWithTicket(false);
    actions$.next(atencionMutationFailure({ error: {} as any }));
    expect(finished).toBe(false);
    expect(readAtencionSession()).not.toBeNull(); // session survives — user can retry
  });
});
