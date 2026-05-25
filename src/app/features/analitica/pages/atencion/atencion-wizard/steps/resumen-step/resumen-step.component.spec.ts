import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { ReplaySubject } from 'rxjs';
import { ResumenStepComponent } from './resumen-step.component';
import * as A from '../../../../../store/atencion/atencion.actions';
import { AttentionState } from '../../../../../models/atencion.model';
import { selectMutating } from '../../../../../store/atencion/atencion.selectors';
import { readAtencionSession, writeAtencionSession } from '../../../../../utils/atencion-session-store';

describe('ResumenStepComponent', () => {
  let fixture: ComponentFixture<ResumenStepComponent>;
  let dispatched: any[];
  let actions$: ReplaySubject<Action>;

  beforeEach(async () => {
    sessionStorage.clear();
    actions$ = new ReplaySubject<Action>(1);
    await TestBed.configureTestingModule({
      imports: [ResumenStepComponent],
      providers: [
        provideMockStore({
          selectors: [{ selector: selectMutating, value: false }],
        }),
        provideMockActions(() => actions$),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ResumenStepComponent);
    fixture.componentRef.setInput('atencion', {
      id: 42, tenantId: 1, attentionNumber: 'A-042', patientId: 100,
      doctorId: null, branchId: 1, insurancePlanId: null, indications: 'Ayuno',
      paymentId: null, protocolId: null, extractorId: null, attentionBox: null,
      deskAttentionBox: null, prescriptionFileUrl: null, isUrgent: true,
      authorizationNumber: null, observations: null, cancellationReason: null,
      cancelledAtState: null, attentionState: AttentionState.AWAITING_CONFIRMATION,
      mostAdvancedState: AttentionState.AWAITING_CONFIRMATION, analysisAuthorizations: [],
    });
    fixture.detectChanges();
    dispatched = [];
    (fixture.componentInstance as any)['store'].dispatch = vi.fn().mockImplementation((x: any) => dispatched.push(x));
  });

  it('onFinishWithTicket dispatches endSecretaryPhase', () => {
    fixture.componentInstance.onFinishWithTicket(false);
    expect(dispatched[0].type).toBe(A.endSecretaryPhase.type);
  });

  it('opens ticket modal when finalize button clicked', () => {
    expect(fixture.componentInstance.ticketModalOpen()).toBe(false);
    fixture.componentInstance.openFinalize();
    expect(fixture.componentInstance.ticketModalOpen()).toBe(true);
  });

  it('emits finished + clears session ONLY after atencionMutationSuccess', () => {
    writeAtencionSession({ atencionId: 42, uiStep: 'confirmar' });
    let finished = false;
    fixture.componentInstance.finished.subscribe(() => (finished = true));
    fixture.componentInstance.onFinishWithTicket(false);
    // Antes del success: no se completó
    expect(finished).toBe(false);
    expect(readAtencionSession()).not.toBeNull();
    // Llega el success → completar
    actions$.next(A.atencionMutationSuccess({ item: {} as any }));
    expect(finished).toBe(true);
    expect(readAtencionSession()).toBeNull();
  });

  it('does NOT emit finished / clear session when mutation fails', () => {
    writeAtencionSession({ atencionId: 42, uiStep: 'confirmar' });
    let finished = false;
    fixture.componentInstance.finished.subscribe(() => (finished = true));
    fixture.componentInstance.onFinishWithTicket(false);
    actions$.next(A.atencionMutationFailure({ error: {} as any }));
    expect(finished).toBe(false);
    expect(readAtencionSession()).not.toBeNull(); // sessión sobrevive — el usuario puede reintentar
  });
});
