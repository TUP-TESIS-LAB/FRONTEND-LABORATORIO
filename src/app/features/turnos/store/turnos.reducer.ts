import { createReducer, on } from '@ngrx/store';
import { initialTurnosState, TurnosState } from './turnos.state';
import { loadTurnos, loadTurnosFailure, loadTurnosSuccess } from './turnos.actions';

export const turnosReducer = createReducer(
  initialTurnosState,

  on(loadTurnos, (state): TurnosState => ({
    ...state,
    pending: true,
    error: null,
  })),

  on(loadTurnosSuccess, (state, { turnos }): TurnosState => ({
    ...state,
    turnos,
    pending: false,
    error: null,
  })),

  on(loadTurnosFailure, (state, { error }): TurnosState => ({
    ...state,
    pending: false,
    error,
  }))
);
