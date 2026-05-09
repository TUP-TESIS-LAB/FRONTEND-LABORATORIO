import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TURNOS_FEATURE_KEY, TurnosState } from './turnos.state';

export const selectTurnosState =
  createFeatureSelector<TurnosState>(TURNOS_FEATURE_KEY);

export const selectAllTurnos = createSelector(
  selectTurnosState,
  state => state.turnos
);

export const selectTurnosPending = createSelector(
  selectTurnosState,
  state => state.pending
);

export const selectTurnosError = createSelector(
  selectTurnosState,
  state => state.error
);
