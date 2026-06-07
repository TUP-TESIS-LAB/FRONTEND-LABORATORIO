import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, of, throwError } from 'rxjs';
import { NOT_MODIFIED } from '@core/refresh';
import { AppointmentsEffects } from './appointments.effects';
import { AppointmentService } from '../../services/appointment.service';
import {
  loadTodayAppointments,
  loadTodayAppointmentsSuccess,
  loadTodayAppointmentsNotModified,
  loadTodayAppointmentsFailure,
} from './appointments.actions';
import { Appointment } from '../../models/appointment.model';

function makeAppointment(over: Partial<Appointment> = {}): Appointment {
  return {
    id: 1,
    patientId: 10,
    patientName: 'Paciente Test',
    nationalId: '12345678',
    appointmentTime: '2026-06-07T09:00:00Z',
    branchId: 1,
    status: 'SCHEDULED',
    ...over,
  };
}

describe('AppointmentsEffects — loadToday$', () => {
  let actions$: Observable<Action>;
  let service: { listToday: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { listToday: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AppointmentsEffects,
        provideMockActions(() => actions$),
        { provide: AppointmentService, useValue: service },
      ],
    });
  });

  it('dispatches loadTodayAppointmentsSuccess cuando el servicio devuelve datos', () => {
    return new Promise<void>((resolve) => {
      const appointments = [makeAppointment()];
      service.listToday.mockReturnValue(of(appointments));
      actions$ = of(loadTodayAppointments({ branchId: 1 }));

      TestBed.inject(AppointmentsEffects).loadToday$.subscribe((action) => {
        expect(service.listToday).toHaveBeenCalledWith(1);
        expect(action).toEqual(loadTodayAppointmentsSuccess({ appointments }));
        resolve();
      });
    });
  });

  it('dispatches loadTodayAppointmentsNotModified cuando el servicio devuelve 304', () => {
    return new Promise<void>((resolve) => {
      service.listToday.mockReturnValue(of(NOT_MODIFIED));
      actions$ = of(loadTodayAppointments({ branchId: 2 }));

      TestBed.inject(AppointmentsEffects).loadToday$.subscribe((action) => {
        expect(service.listToday).toHaveBeenCalledWith(2);
        expect(action).toEqual(loadTodayAppointmentsNotModified());
        resolve();
      });
    });
  });

  it('dispatches loadTodayAppointmentsFailure cuando el servicio lanza error', () => {
    return new Promise<void>((resolve) => {
      const error = new Error('500 Internal Server Error');
      service.listToday.mockReturnValue(throwError(() => error));
      actions$ = of(loadTodayAppointments({ branchId: 3 }));

      TestBed.inject(AppointmentsEffects).loadToday$.subscribe((action) => {
        expect(action.type).toBe(loadTodayAppointmentsFailure.type);
        resolve();
      });
    });
  });
});
