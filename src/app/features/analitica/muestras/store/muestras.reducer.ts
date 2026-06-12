import { createReducer, on } from '@ngrx/store';
import { initialMuestrasState, MuestrasState } from './muestras.state';
import {
  initMuestrasSuccess, initMuestrasFailure,
  loadRecoleccion, loadRecoleccionSuccess, loadRecoleccionNotModified, loadRecoleccionFailure,
  transitionLabels, transitionLabelsSuccess, transitionLabelsFailure,
} from './muestras.actions';

export const muestrasReducer = createReducer(
  initialMuestrasState,

  on(initMuestrasSuccess, (state, { branchId, branchName }): MuestrasState => ({
    ...state, branchId, branchName, error: null,
  })),
  on(initMuestrasFailure, (state, { error }): MuestrasState => ({ ...state, error })),

  on(loadRecoleccion, (state): MuestrasState => ({ ...state, pending: true })),
  on(loadRecoleccionSuccess, (state, { items }): MuestrasState => ({
    ...state, recoleccion: items, pending: false, error: null,
  })),
  on(loadRecoleccionNotModified, (state): MuestrasState => ({ ...state, pending: false })),
  on(loadRecoleccionFailure, (state, { error }): MuestrasState => ({ ...state, pending: false, error })),

  on(transitionLabels, (state): MuestrasState => ({ ...state, transitionPending: true, error: null })),
  on(transitionLabelsSuccess, (state): MuestrasState => ({ ...state, transitionPending: false })),
  on(transitionLabelsFailure, (state, { error }): MuestrasState => ({ ...state, transitionPending: false, error })),
);
