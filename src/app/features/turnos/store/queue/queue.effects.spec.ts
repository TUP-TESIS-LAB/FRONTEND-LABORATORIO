import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { signal } from '@angular/core';
import { QueueEffects } from './queue.effects';
import { QueueService } from '../../services/queue.service';
import {
  callAppointmentForAttention,
  callAppointmentForAttentionSuccess,
  callAppointmentForAttentionFailure,
  loadQueue,
  loadQueueSuccess,
  loadQueueFailure,
} from './queue.actions';
import { OperatorBranchContextService } from '../../services/operator-branch.context';

describe('QueueEffects — load$', () => {
  let actions$: Observable<Action>;
  let queueService: {
    list: ReturnType<typeof vi.fn>;
    call: ReturnType<typeof vi.fn>;
    callByAppointment: ReturnType<typeof vi.fn>;
  };
  let branchContext: { branchId: ReturnType<typeof signal<number | null>> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    queueService = { list: vi.fn(), call: vi.fn(), callByAppointment: vi.fn() };
    branchContext = { branchId: signal<number | null>(null) };
    router = { navigate: vi.fn() };
    messageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        QueueEffects,
        provideMockActions(() => actions$),
        { provide: QueueService, useValue: queueService },
        { provide: OperatorBranchContextService, useValue: branchContext },
        { provide: Router, useValue: router },
        { provide: MessageService, useValue: messageService },
      ],
    });
  });

  it('usa branchId explicito si la action lo trae', () => {
    return new Promise<void>((resolve) => {
      queueService.list.mockReturnValue(of([]));
      actions$ = of(loadQueue({ branchId: 42 }));

      TestBed.inject(QueueEffects).load$.subscribe((action) => {
        expect(queueService.list).toHaveBeenCalledWith(42);
        expect(action).toEqual(loadQueueSuccess({ entries: [] }));
        resolve();
      });
    });
  });

  it('cae al branchId del context si la action no lo trae', () => {
    return new Promise<void>((resolve) => {
      branchContext.branchId.set(7);
      queueService.list.mockReturnValue(of([]));
      actions$ = of(loadQueue({}));

      TestBed.inject(QueueEffects).load$.subscribe((action) => {
        expect(queueService.list).toHaveBeenCalledWith(7);
        expect(action).toEqual(loadQueueSuccess({ entries: [] }));
        resolve();
      });
    });
  });

  it('dispatcha failure si ni action ni context tienen branchId', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(loadQueue({}));

      TestBed.inject(QueueEffects).load$.subscribe((action) => {
        expect(queueService.list).not.toHaveBeenCalled();
        expect(action.type).toBe(loadQueueFailure.type);
        resolve();
      });
    });
  });
});

describe('QueueEffects — callAppointmentForAttention', () => {
  let actions$: Observable<Action>;
  let queueService: {
    list: ReturnType<typeof vi.fn>;
    call: ReturnType<typeof vi.fn>;
    callByAppointment: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    queueService = { list: vi.fn(), call: vi.fn(), callByAppointment: vi.fn() };
    router = { navigate: vi.fn() };
    messageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        QueueEffects,
        provideMockActions(() => actions$),
        { provide: QueueService, useValue: queueService },
        { provide: OperatorBranchContextService, useValue: { branchId: signal<number | null>(null) } },
        { provide: Router, useValue: router },
        { provide: MessageService, useValue: messageService },
      ],
    });
  });

  it('on success: dispatches callAppointmentForAttentionSuccess con dni', () => {
    return new Promise<void>((resolve) => {
      queueService.callByAppointment.mockReturnValue(of({ queueEntryId: 50 }));
      actions$ = of(callAppointmentForAttention({ appointmentId: 100, dni: '12345678' }));

      TestBed.inject(QueueEffects).callAppointmentForAttention$.subscribe((action) => {
        expect(action).toEqual(callAppointmentForAttentionSuccess({ appointmentId: 100, dni: '12345678' }));
        resolve();
      });
    });
  });

  it('navigateAfterCall$: navigates to /analitica/atencion/nueva con dni en queryParams', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(callAppointmentForAttentionSuccess({ appointmentId: 100, dni: '12345678' }));

      TestBed.inject(QueueEffects).navigateAfterCall$.subscribe(() => {
        expect(router.navigate).toHaveBeenCalledWith(
          ['/analitica/atencion/nueva'],
          { queryParams: { dni: '12345678' } }
        );
        resolve();
      });
    });
  });

  it('navigateAfterCall$: navega sin dni en queryParams si dni es null', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(callAppointmentForAttentionSuccess({ appointmentId: 100, dni: null }));

      TestBed.inject(QueueEffects).navigateAfterCall$.subscribe(() => {
        expect(router.navigate).toHaveBeenCalledWith(
          ['/analitica/atencion/nueva'],
          { queryParams: {} }
        );
        resolve();
      });
    });
  });

  it('on failure: dispatches callAppointmentForAttentionFailure and does not navigate', () => {
    return new Promise<void>((resolve) => {
      queueService.callByAppointment.mockReturnValue(throwError(() => new Error('500')));
      actions$ = of(callAppointmentForAttention({ appointmentId: 100, dni: '12345678' }));

      TestBed.inject(QueueEffects).callAppointmentForAttention$.subscribe((action) => {
        expect(action.type).toBe(callAppointmentForAttentionFailure.type);
        expect(router.navigate).not.toHaveBeenCalled();
        resolve();
      });
    });
  });
});
