import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { QueueEffects } from './queue.effects';
import { QueueService } from '../../services/queue.service';
import {
  callAppointmentForAttention,
  callAppointmentForAttentionSuccess,
  callAppointmentForAttentionFailure,
} from './queue.actions';

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
        { provide: Router, useValue: router },
        { provide: MessageService, useValue: messageService },
      ],
    });
  });

  it('on success: dispatches callAppointmentForAttentionSuccess', () => {
    return new Promise<void>((resolve) => {
      queueService.callByAppointment.mockReturnValue(of({ queueEntryId: 50 }));
      actions$ = of(callAppointmentForAttention({ appointmentId: 100 }));

      TestBed.inject(QueueEffects).callAppointmentForAttention$.subscribe((action) => {
        expect(action).toEqual(callAppointmentForAttentionSuccess({ appointmentId: 100 }));
        resolve();
      });
    });
  });

  it('navigateAfterCall$: navigates to atencion-turno with appointmentId as query param', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(callAppointmentForAttentionSuccess({ appointmentId: 100 }));

      TestBed.inject(QueueEffects).navigateAfterCall$.subscribe(() => {
        expect(router.navigate).toHaveBeenCalledWith(
          ['/turnos/atencion-turno'],
          { queryParams: { appointmentId: 100 } }
        );
        resolve();
      });
    });
  });

  it('on failure: dispatches callAppointmentForAttentionFailure and does not navigate', () => {
    return new Promise<void>((resolve) => {
      queueService.callByAppointment.mockReturnValue(throwError(() => new Error('500')));
      actions$ = of(callAppointmentForAttention({ appointmentId: 100 }));

      TestBed.inject(QueueEffects).callAppointmentForAttention$.subscribe((action) => {
        expect(action.type).toBe(callAppointmentForAttentionFailure.type);
        expect(router.navigate).not.toHaveBeenCalled();
        resolve();
      });
    });
  });
});
