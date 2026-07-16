import { createReducer, on } from '@ngrx/store';
import * as A from './sacar-turno.actions';
import { initialSacarTurnoState } from './sacar-turno.state';

export const sacarTurnoReducer = createReducer(
  initialSacarTurnoState,

  // Tipos
  on(A.loadTipos, (s) => ({ ...s, tiposLoading: true, error: null })),
  on(A.loadTiposSuccess, (s, { tipos }) => ({ ...s, tipos, tiposLoading: false })),
  on(A.loadTiposFailure, (s, { error }) => ({ ...s, tiposLoading: false, error })),

  // Sucursales
  on(A.loadBranches, (s) => ({ ...s, branchesLoading: true, error: null })),
  on(A.loadBranchesSuccess, (s, { branches }) => ({ ...s, branches, branchesLoading: false })),
  on(A.loadBranchesFailure, (s, { error }) => ({ ...s, branchesLoading: false, error })),

  // Slots
  on(A.loadSlots, (s) => ({ ...s, slotsLoading: true, slots: [], error: null })),
  on(A.loadSlotsSuccess, (s, { slots }) => ({ ...s, slots, slotsLoading: false })),
  on(A.loadSlotsFailure, (s, { error }) => ({ ...s, slotsLoading: false, error })),
  on(A.clearSlots, (s) => ({ ...s, slots: [] })),

  // Alta rápida de paciente
  on(A.createPatient, (s) => ({ ...s, creatingPatient: true, error: null })),
  on(A.createPatientSuccess, (s, { patient }) => ({ ...s, creatingPatient: false, createdPatient: patient })),
  on(A.createPatientFailure, (s, { error }) => ({ ...s, creatingPatient: false, error })),
  on(A.createPatientHandled, (s) => ({ ...s, createdPatient: null })),

  // Reserva
  on(A.book, (s) => ({ ...s, booking: true, error: null })),
  on(A.bookSuccess, (s, { id }) => ({ ...s, booking: false, bookedId: id })),
  on(A.bookFailure, (s, { error }) => ({ ...s, booking: false, error })),
  on(A.bookHandled, (s) => ({ ...s, bookedId: null })),

  on(A.resetSacarTurno, () => initialSacarTurnoState),
);
