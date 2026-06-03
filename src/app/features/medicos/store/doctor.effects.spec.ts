import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { DoctorEffects } from './doctor.effects';
import { DoctorService } from '../services/doctor.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadDoctors, loadDoctorsSuccess, loadDoctorsFailure,
  addDoctor, addDoctorSuccess,
  toggleDoctorStatus, toggleDoctorStatusSuccess,
  deleteDoctor, deleteDoctorSuccess,
} from './doctor.actions';
import { Doctor } from '../models/doctor.model';

const doc: Doctor = { id: 1, firstName: 'a', lastName: 'b', tuition: 'M1', registrationType: 'NACIONAL', active: true };

describe('DoctorEffects', () => {
  let actions$: Observable<Action>;
  let svc: { list: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; toggleStatus: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  const notify = { error: vi.fn(), success: vi.fn() };

  beforeEach(() => {
    svc = { list: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), toggleStatus: vi.fn(), remove: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        DoctorEffects,
        provideMockActions(() => actions$),
        { provide: DoctorService, useValue: svc },
        { provide: NotificationService, useValue: notify },
      ],
    });
  });

  it('loadDoctors$ maps to loadDoctorsSuccess', () =>
    new Promise<void>((resolve) => {
      svc.list.mockReturnValue(of([doc]));
      actions$ = of(loadDoctors());
      TestBed.inject(DoctorEffects).loadDoctors$.subscribe((a) => {
        expect(a).toEqual(loadDoctorsSuccess({ doctors: [doc] }));
        resolve();
      });
    }));

  it('loadDoctors$ maps errors to loadDoctorsFailure', () =>
    new Promise<void>((resolve) => {
      svc.list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      actions$ = of(loadDoctors());
      TestBed.inject(DoctorEffects).loadDoctors$.subscribe((a) => {
        expect(a.type).toBe(loadDoctorsFailure.type);
        resolve();
      });
    }));

  it('addDoctor$ maps to addDoctorSuccess', () =>
    new Promise<void>((resolve) => {
      svc.create.mockReturnValue(of(doc));
      actions$ = of(addDoctor({ req: { firstName: 'a', lastName: 'b', tuition: 'M1', registrationType: 'NACIONAL' } }));
      TestBed.inject(DoctorEffects).addDoctor$.subscribe((a) => {
        expect(a).toEqual(addDoctorSuccess({ doctor: doc }));
        resolve();
      });
    }));

  it('toggleDoctorStatus$ maps to toggleDoctorStatusSuccess with returned doctor', () =>
    new Promise<void>((resolve) => {
      svc.toggleStatus.mockReturnValue(of({ ...doc, active: false }));
      actions$ = of(toggleDoctorStatus({ id: 1 }));
      TestBed.inject(DoctorEffects).toggleDoctorStatus$.subscribe((a) => {
        expect(a).toEqual(toggleDoctorStatusSuccess({ doctor: { ...doc, active: false } }));
        resolve();
      });
    }));

  it('deleteDoctor$ maps to deleteDoctorSuccess with id', () =>
    new Promise<void>((resolve) => {
      svc.remove.mockReturnValue(of(undefined));
      actions$ = of(deleteDoctor({ id: 1 }));
      TestBed.inject(DoctorEffects).deleteDoctor$.subscribe((a) => {
        expect(a).toEqual(deleteDoctorSuccess({ id: 1 }));
        resolve();
      });
    }));
});
