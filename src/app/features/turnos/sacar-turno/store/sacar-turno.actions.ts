import { createAction, props } from '@ngrx/store';
import { CreatePatientRequest, Patient } from '@features/pacientes/models/patient.model';
import { BookAppointmentRequest, SlotDisponible, TipoAnalisis } from '../models/sacar-turno.model';

// ── Catálogo de tipos de análisis ────────────────────────────
export const loadTipos = createAction('[Sacar Turno] Load Tipos');
export const loadTiposSuccess = createAction('[Sacar Turno] Load Tipos Success', props<{ tipos: TipoAnalisis[] }>());
export const loadTiposFailure = createAction('[Sacar Turno] Load Tipos Failure', props<{ error: unknown }>());

// ── Sucursales para el selector ──────────────────────────────
export const loadBranches = createAction('[Sacar Turno] Load Branches');
export const loadBranchesSuccess = createAction('[Sacar Turno] Load Branches Success', props<{ branches: Array<{ id: number; name: string }> }>());
export const loadBranchesFailure = createAction('[Sacar Turno] Load Branches Failure', props<{ error: unknown }>());

// ── Slots disponibles (sucursal + fecha) ─────────────────────
export const loadSlots = createAction('[Sacar Turno] Load Slots', props<{ branchId: number; date: Date }>());
export const loadSlotsSuccess = createAction('[Sacar Turno] Load Slots Success', props<{ slots: SlotDisponible[] }>());
export const loadSlotsFailure = createAction('[Sacar Turno] Load Slots Failure', props<{ error: unknown }>());
export const clearSlots = createAction('[Sacar Turno] Clear Slots');

// ── Alta rápida de paciente ──────────────────────────────────
export const createPatient = createAction('[Sacar Turno] Create Patient', props<{ request: CreatePatientRequest }>());
export const createPatientSuccess = createAction('[Sacar Turno] Create Patient Success', props<{ patient: Patient }>());
export const createPatientFailure = createAction('[Sacar Turno] Create Patient Failure', props<{ error: unknown }>());
export const createPatientHandled = createAction('[Sacar Turno] Create Patient Handled');

// ── Reserva del turno ────────────────────────────────────────
export const book = createAction('[Sacar Turno] Book', props<{ request: BookAppointmentRequest }>());
export const bookSuccess = createAction('[Sacar Turno] Book Success', props<{ id: number }>());
export const bookFailure = createAction('[Sacar Turno] Book Failure', props<{ error: unknown }>());
export const bookHandled = createAction('[Sacar Turno] Book Handled');

// ── Reset al entrar/salir del wizard ─────────────────────────
export const resetSacarTurno = createAction('[Sacar Turno] Reset');
