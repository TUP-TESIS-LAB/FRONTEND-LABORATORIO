import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { PatientEffects } from './patient.effects';
import { PatientService } from '../services/patient.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadPatients, loadPatientsSuccess, loadPatientsFailure,
  addPatient, addPatientSuccess,
  togglePatientActive, togglePatientActiveSuccess,
} from './patient.actions';
import { initialPatientState, PATIENT_FEATURE_KEY } from './patient.state';
import { Patient } from '../models/patient.model';

const patient: Patient = {
  id: 1, dni: '32456789', firstName: 'a', lastName: 'b', birthDate: null,
  gender: null, sexAtBirth: null, status: 'MIN',
  contacts: [], addresses: [], coverages: [], active: true,
};

describe('PatientEffects', () => {
  let actions$: Observable<Action>;
  let svc: { search: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; toggleActive: ReturnType<typeof vi.fn>; existsByDni: ReturnType<typeof vi.fn> };
  const notify = { error: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn(), show: vi.fn(), dismiss: vi.fn(), clear: vi.fn() };

  beforeEach(() => {
    svc = { search: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), toggleActive: vi.fn(), existsByDni: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        PatientEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { [PATIENT_FEATURE_KEY]: initialPatientState } }),
        { provide: PatientService, useValue: svc },
        { provide: NotificationService, useValue: notify },
      ],
    });
  });

  it('loadPatients$ maps to loadPatientsSuccess', () => {
    return new Promise<void>((resolve) => {
      svc.search.mockReturnValue(of({ content: [patient], totalElements: 1, totalPages: 1, page: 0, size: 20 }));
      actions$ = of(loadPatients({ req: initialPatientState.pageRequest }));
      TestBed.inject(PatientEffects).loadPatients$.subscribe((a) => {
        expect(a.type).toBe(loadPatientsSuccess.type);
        resolve();
      });
    });
  });

  it('loadPatients$ maps errors to loadPatientsFailure', () => {
    return new Promise<void>((resolve) => {
      svc.search.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      actions$ = of(loadPatients({ req: initialPatientState.pageRequest }));
      TestBed.inject(PatientEffects).loadPatients$.subscribe((a) => {
        expect(a.type).toBe(loadPatientsFailure.type);
        resolve();
      });
    });
  });

  it('addPatient$ maps success to addPatientSuccess', () => {
    return new Promise<void>((resolve) => {
      svc.create.mockReturnValue(of(patient));
      actions$ = of(addPatient({ req: { dni: '1', firstName: 'a', lastName: 'b', birthDate: null, gender: null, sexAtBirth: null, contacts: [], addresses: [], coverages: [] } }));
      TestBed.inject(PatientEffects).addPatient$.subscribe((a) => {
        expect(a.type).toBe(addPatientSuccess.type);
        resolve();
      });
    });
  });

  it('togglePatientActive$ maps to togglePatientActiveSuccess with id and deleted', () => {
    return new Promise<void>((resolve) => {
      svc.toggleActive.mockReturnValue(of(undefined));
      actions$ = of(togglePatientActive({ id: 1, deleted: true }));
      TestBed.inject(PatientEffects).togglePatientActive$.subscribe((a) => {
        expect(a).toEqual(togglePatientActiveSuccess({ id: 1, deleted: true }));
        resolve();
      });
    });
  });
});
