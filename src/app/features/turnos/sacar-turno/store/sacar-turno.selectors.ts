import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SACAR_TURNO_FEATURE_KEY, SacarTurnoState } from './sacar-turno.state';

export const selectSacarTurnoState = createFeatureSelector<SacarTurnoState>(SACAR_TURNO_FEATURE_KEY);

export const selectTipos = createSelector(selectSacarTurnoState, (s) => s.tipos);
export const selectTiposLoading = createSelector(selectSacarTurnoState, (s) => s.tiposLoading);

export const selectBranches = createSelector(selectSacarTurnoState, (s) => s.branches);
export const selectBranchesLoading = createSelector(selectSacarTurnoState, (s) => s.branchesLoading);

export const selectSlots = createSelector(selectSacarTurnoState, (s) => s.slots);
export const selectSlotsLoading = createSelector(selectSacarTurnoState, (s) => s.slotsLoading);

export const selectCreatingPatient = createSelector(selectSacarTurnoState, (s) => s.creatingPatient);
export const selectCreatedPatient = createSelector(selectSacarTurnoState, (s) => s.createdPatient);

export const selectBooking = createSelector(selectSacarTurnoState, (s) => s.booking);
export const selectBookedId = createSelector(selectSacarTurnoState, (s) => s.bookedId);

export const selectSacarTurnoError = createSelector(selectSacarTurnoState, (s) => s.error);
