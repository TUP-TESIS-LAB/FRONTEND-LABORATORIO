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
  addPatient, addPatientSuccess, updatePatientSuccess,
  togglePatientActive, togglePatientActiveSuccess,
  verifyPatient, verifyPatientSuccess, verifyPatientFailure,
} from './patient.actions';
import { initialPatientState, PATIENT_FEATURE_KEY } from './patient.state';
import { Patient } from '../models/patient.model';

const patient: Patient = {
  id: 1, dni: '32456789', firstName: 'a', lastName: 'b', birthDate: null,
  gender: null, sexAtBirth: null, status: 'MIN', source: 'STAFF', verifiedAt: null,
  contacts: [], addresses: [], coverages: [], active: true,
};

describe('PatientEffects', () => {
  let actions$: Observable<Action>;
  let svc: { search: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; toggleActive: ReturnType<typeof vi.fn>; existsByDni: ReturnType<typeof vi.fn>; verify: ReturnType<typeof vi.fn> };
  const notify = { error: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn(), show: vi.fn(), dismiss: vi.fn(), clear: vi.fn() };

  beforeEach(() => {
    svc = { search: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), toggleActive: vi.fn(), existsByDni: vi.fn(), verify: vi.fn() };
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

  // --- Auto-verify de alta/edición manual (source=STAFF) ---

  it('autoVerifyOnSave$ encadena verifyPatient tras un alta STAFF sin verificar', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(addPatientSuccess({ patient: { ...patient, source: 'STAFF', verifiedAt: null } }));
      TestBed.inject(PatientEffects).autoVerifyOnSave$.subscribe((a) => {
        expect(a).toEqual(verifyPatient({ id: patient.id }));
        resolve();
      });
    });
  });

  it('autoVerifyOnSave$ encadena verifyPatient tras una edición STAFF sin verificar', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(updatePatientSuccess({ patient: { ...patient, source: 'STAFF', verifiedAt: null } }));
      TestBed.inject(PatientEffects).autoVerifyOnSave$.subscribe((a) => {
        expect(a).toEqual(verifyPatient({ id: patient.id }));
        resolve();
      });
    });
  });

  it('autoVerifyOnSave$ NO auto-verifica a un paciente PORTAL', () => {
    return new Promise<void>((resolve) => {
      const emitted: Action[] = [];
      actions$ = of(addPatientSuccess({ patient: { ...patient, source: 'PORTAL', verifiedAt: null } }));
      TestBed.inject(PatientEffects).autoVerifyOnSave$.subscribe((a) => emitted.push(a));
      // El effect no debe emitir verifyPatient para PORTAL.
      setTimeout(() => {
        expect(emitted).toEqual([]);
        resolve();
      }, 0);
    });
  });

  it('autoVerifyOnSave$ NO re-verifica si el paciente STAFF ya estaba verificado', () => {
    return new Promise<void>((resolve) => {
      const emitted: Action[] = [];
      actions$ = of(updatePatientSuccess({ patient: { ...patient, source: 'STAFF', verifiedAt: '2026-01-01T00:00:00Z' } }));
      TestBed.inject(PatientEffects).autoVerifyOnSave$.subscribe((a) => emitted.push(a));
      setTimeout(() => {
        expect(emitted).toEqual([]);
        resolve();
      }, 0);
    });
  });

  it('verifyPatient$ llama al endpoint y mapea a verifyPatientSuccess', () => {
    return new Promise<void>((resolve) => {
      const verified: Patient = { ...patient, verifiedAt: '2026-06-09T10:00:00Z' };
      svc.verify.mockReturnValue(of(verified));
      actions$ = of(verifyPatient({ id: patient.id }));
      TestBed.inject(PatientEffects).verifyPatient$.subscribe((a) => {
        expect(svc.verify).toHaveBeenCalledWith(patient.id);
        expect(a).toEqual(verifyPatientSuccess({ patient: verified }));
        resolve();
      });
    });
  });

  it('verifyPatient$ ante un 422 (no verificable) falla en silencio sin notificar', () => {
    return new Promise<void>((resolve) => {
      // El mock `notify` es a nivel de módulo y otros tests lo invocan; lo
      // aislamos para verificar que verifyPatient$ NO agrega notificación.
      notify.error.mockClear();
      svc.verify.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
      actions$ = of(verifyPatient({ id: patient.id }));
      TestBed.inject(PatientEffects).verifyPatient$.subscribe((a) => {
        expect(a.type).toBe(verifyPatientFailure.type);
        expect(notify.error).not.toHaveBeenCalled();
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
