import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { ResumenStepComponent } from './resumen-step.component';
import * as A from '../../../../../store/atencion/atencion.actions';
import { AttentionState } from '../../../../../models/atencion.model';

describe('ResumenStepComponent', () => {
  let fixture: ComponentFixture<ResumenStepComponent>;
  let dispatched: any[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenStepComponent],
      providers: [provideMockStore()],
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
});
