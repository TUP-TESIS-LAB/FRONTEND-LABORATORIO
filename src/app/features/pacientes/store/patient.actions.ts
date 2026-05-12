import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { CreatePatientRequest, Patient, UpdatePatientRequest } from '../models/patient.model';
import { PatientPageRequest, PatientPageResult } from '../models/patient-page.model';

// --- List (read) ---
export const loadPatients = createAction(
  '[Patients Page] Load Patients',
  props<{ req: PatientPageRequest }>(),
);
export const loadPatientsSuccess = createAction(
  '[Patients API] Load Patients Success',
  props<{ result: PatientPageResult }>(),
);
export const loadPatientsFailure = createAction(
  '[Patients API] Load Patients Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const setPatientPageRequest = createAction(
  '[Patients Page] Set Page Request',
  props<{ patch: Partial<PatientPageRequest> }>(),
);

// --- Detail (read) ---
export const loadPatient = createAction(
  '[Patient Detail] Load Patient',
  props<{ id: number }>(),
);
export const loadPatientSuccess = createAction(
  '[Patients API] Load Patient Success',
  props<{ patient: Patient }>(),
);
export const loadPatientFailure = createAction(
  '[Patients API] Load Patient Failure',
  props<{ error: HttpErrorResponse }>(),
);
export const clearSelectedPatient = createAction('[Patient Detail] Clear Selected');

// --- Add (submit, exhaustMap) ---
export const addPatient = createAction(
  '[Patient Form] Add Patient',
  props<{ req: CreatePatientRequest }>(),
);
export const addPatientSuccess = createAction(
  '[Patients API] Add Patient Success',
  props<{ patient: Patient }>(),
);
export const addPatientFailure = createAction(
  '[Patients API] Add Patient Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Update (submit, exhaustMap) ---
export const updatePatient = createAction(
  '[Patient Form] Update Patient',
  props<{ id: number; req: UpdatePatientRequest }>(),
);
export const updatePatientSuccess = createAction(
  '[Patients API] Update Patient Success',
  props<{ patient: Patient }>(),
);
export const updatePatientFailure = createAction(
  '[Patients API] Update Patient Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- DNI check (read with debounce in effect) ---
export const checkPatientDni = createAction(
  '[Patient Form] Check Patient Dni',
  props<{ dni: string }>(),
);
export const checkPatientDniSuccess = createAction(
  '[Patients API] Check Patient Dni Success',
  props<{ dni: string; exists: boolean }>(),
);
export const checkPatientDniFailure = createAction(
  '[Patients API] Check Patient Dni Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Toggle active (mutation, concatMap) ---
export const togglePatientActive = createAction(
  '[Patient Row] Toggle Patient Active',
  props<{ id: number; deleted: boolean }>(),
);
export const togglePatientActiveSuccess = createAction(
  '[Patients API] Toggle Patient Active Success',
  props<{ id: number; deleted: boolean }>(),
);
export const togglePatientActiveFailure = createAction(
  '[Patients API] Toggle Patient Active Failure',
  props<{ error: HttpErrorResponse }>(),
);
