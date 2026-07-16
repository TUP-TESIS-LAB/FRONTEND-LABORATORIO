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
  attendWalkinEntry,
  attendWalkinEntrySuccess,
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
    attendByAppointment: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    queueService = {
      list: vi.fn(),
      call: vi.fn(),
      callByAppointment: vi.fn(),
      attendByAppointment: vi.fn(),
    };
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

  it('on success: dispatches callAppointmentForAttentionSuccess con dni y queueEntryId', () => {
    return new Promise<void>((resolve) => {
      queueService.attendByAppointment.mockReturnValue(of({ id: 50, lastCalledAt: '', callCount: 1, status: 'COMPLETED' }));
      actions$ = of(callAppointmentForAttention({ appointmentId: 100, dni: '12345678', queueEntryId: 50 }));

      TestBed.inject(QueueEffects).callAppointmentForAttention$.subscribe((action) => {
        expect(action).toEqual(callAppointmentForAttentionSuccess({ appointmentId: 100, dni: '12345678', queueEntryId: 50 }));
        resolve();
      });
    });
  });

  it('navigateAfterCall$: navigates to /analitica/atencion/nueva con dni y queueEntryId en queryParams', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(callAppointmentForAttentionSuccess({ appointmentId: 100, dni: '12345678', queueEntryId: 50 }));

      TestBed.inject(QueueEffects).navigateAfterCall$.subscribe(() => {
        expect(router.navigate).toHaveBeenCalledWith(
          ['/analitica/atencion/nueva'],
          { queryParams: { queueEntryId: 50, dni: '12345678' } }
        );
        resolve();
      });
    });
  });

  it('navigateAfterCall$: navega con solo queueEntryId en queryParams si dni es null', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(callAppointmentForAttentionSuccess({ appointmentId: 100, dni: null, queueEntryId: 50 }));

      TestBed.inject(QueueEffects).navigateAfterCall$.subscribe(() => {
        expect(router.navigate).toHaveBeenCalledWith(
          ['/analitica/atencion/nueva'],
          { queryParams: { queueEntryId: 50 } }
        );
        resolve();
      });
    });
  });

  it('on failure: dispatches callAppointmentForAttentionFailure and does not navigate', () => {
    return new Promise<void>((resolve) => {
      queueService.attendByAppointment.mockReturnValue(throwError(() => new Error('500')));
      actions$ = of(callAppointmentForAttention({ appointmentId: 100, dni: '12345678', queueEntryId: 50 }));

      TestBed.inject(QueueEffects).callAppointmentForAttention$.subscribe((action) => {
        expect(action.type).toBe(callAppointmentForAttentionFailure.type);
        expect(router.navigate).not.toHaveBeenCalled();
        resolve();
      });
    });
  });
});

describe('QueueEffects — attendWalkin$', () => {
  let actions$: Observable<Action>;
  let queueService: {
    list: ReturnType<typeof vi.fn>;
    call: ReturnType<typeof vi.fn>;
    attendByAppointment: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    queueService = {
      list: vi.fn(),
      call: vi.fn(),
      attendByAppointment: vi.fn(),
      updateStatus: vi.fn(),
      cancel: vi.fn(),
    };
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

  it('attendWalkin$: on success dispatches attendWalkinEntrySuccess with queueEntryId = entryId', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(attendWalkinEntry({ entryId: 77, dni: '30000001' }));

      TestBed.inject(QueueEffects).attendWalkin$.subscribe((action) => {
        expect(action).toEqual(attendWalkinEntrySuccess({ dni: '30000001', queueEntryId: 77 }));
        resolve();
      });
    });
  });

  // REGRESION (KAN-249): el bug de perdida del turno.
  // "Atender" NO debe completar la entry: la atencion recien se crea en el paso 1 del wizard.
  // Si se completa aca, entre el click y el guardado del paso 1 el turno no esta ni en la cola
  // (COMPLETED) ni tiene atencion que retomar — cualquier salida (back, F5, cerrar) lo destruye.
  // La entry queda PENDING y la completa el backend cuando la atencion existe de verdad.
  it('attendWalkin$: NO completa la entry — si la atencion nunca se crea, sigue PENDING y retomable', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(attendWalkinEntry({ entryId: 77, dni: '30000001' }));

      TestBed.inject(QueueEffects).attendWalkin$.subscribe(() => {
        expect(queueService.updateStatus).not.toHaveBeenCalled();
        resolve();
      });
    });
  });

  it('navigateAfterAttendWalkin$: navigates to /analitica/atencion/nueva with queueEntryId and dni', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(attendWalkinEntrySuccess({ dni: '30000001', queueEntryId: 77 }));

      TestBed.inject(QueueEffects).navigateAfterAttendWalkin$.subscribe(() => {
        expect(router.navigate).toHaveBeenCalledWith(
          ['/analitica/atencion/nueva'],
          { queryParams: { queueEntryId: 77, dni: '30000001' } },
        );
        resolve();
      });
    });
  });

  it('navigateAfterAttendWalkin$: navigates with only queueEntryId when dni is null', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(attendWalkinEntrySuccess({ dni: null, queueEntryId: 42 }));

      TestBed.inject(QueueEffects).navigateAfterAttendWalkin$.subscribe(() => {
        expect(router.navigate).toHaveBeenCalledWith(
          ['/analitica/atencion/nueva'],
          { queryParams: { queueEntryId: 42 } },
        );
        resolve();
      });
    });
  });
});
