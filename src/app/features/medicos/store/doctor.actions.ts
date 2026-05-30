import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { CreateDoctorRequest, Doctor, UpdateDoctorRequest } from '../models/doctor.model';

// List
export const loadDoctors = createAction('[Doctors Page] Load Doctors');
export const loadDoctorsSuccess = createAction(
  '[Doctors API] Load Doctors Success', props<{ doctors: Doctor[] }>());
export const loadDoctorsFailure = createAction(
  '[Doctors API] Load Doctors Failure', props<{ error: HttpErrorResponse }>());

// Detail
export const loadDoctor = createAction('[Doctor Form] Load Doctor', props<{ id: number }>());
export const loadDoctorSuccess = createAction(
  '[Doctors API] Load Doctor Success', props<{ doctor: Doctor }>());
export const loadDoctorFailure = createAction(
  '[Doctors API] Load Doctor Failure', props<{ error: HttpErrorResponse }>());
export const clearSelectedDoctor = createAction('[Doctor Form] Clear Selected');

// Add
export const addDoctor = createAction('[Doctor Form] Add Doctor', props<{ req: CreateDoctorRequest }>());
export const addDoctorSuccess = createAction(
  '[Doctors API] Add Doctor Success', props<{ doctor: Doctor }>());
export const addDoctorFailure = createAction(
  '[Doctors API] Add Doctor Failure', props<{ error: HttpErrorResponse }>());

// Update
export const updateDoctor = createAction(
  '[Doctor Form] Update Doctor', props<{ id: number; req: UpdateDoctorRequest }>());
export const updateDoctorSuccess = createAction(
  '[Doctors API] Update Doctor Success', props<{ doctor: Doctor }>());
export const updateDoctorFailure = createAction(
  '[Doctors API] Update Doctor Failure', props<{ error: HttpErrorResponse }>());

// Toggle status (PATCH devuelve el Doctor actualizado)
export const toggleDoctorStatus = createAction(
  '[Doctor Row] Toggle Doctor Status', props<{ id: number }>());
export const toggleDoctorStatusSuccess = createAction(
  '[Doctors API] Toggle Doctor Status Success', props<{ doctor: Doctor }>());
export const toggleDoctorStatusFailure = createAction(
  '[Doctors API] Toggle Doctor Status Failure', props<{ error: HttpErrorResponse }>());

// Delete (soft-delete en back)
export const deleteDoctor = createAction('[Doctor Row] Delete Doctor', props<{ id: number }>());
export const deleteDoctorSuccess = createAction(
  '[Doctors API] Delete Doctor Success', props<{ id: number }>());
export const deleteDoctorFailure = createAction(
  '[Doctors API] Delete Doctor Failure', props<{ error: HttpErrorResponse }>());
