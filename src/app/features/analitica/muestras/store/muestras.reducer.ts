import { createReducer, on } from '@ngrx/store';
import { initialMuestrasState, MuestrasState } from './muestras.state';
import {
  initMuestrasSuccess, initMuestrasFailure,
  loadRecoleccion, loadRecoleccionSuccess, loadRecoleccionNotModified, loadRecoleccionFailure,
  transitionLabels, transitionLabelsSuccess, transitionLabelsFailure,
  loadTransitoSuccess, loadTransitoNotModified, loadTransitoFailure,
  resolveRoutingSuccess, resolveRoutingFailure,
  loadWorkspacesSuccess, loadWorkspacesFailure,
  dispatchTubes, dispatchTubesSuccess, dispatchTubesFailure,
  deriveTubes, deriveTubesSuccess, deriveTubesFailure,
} from './muestras.actions';

export const muestrasReducer = createReducer(
  initialMuestrasState,

  on(initMuestrasSuccess, (state, { branchId, branchName, branches }): MuestrasState => ({
    ...state, branchId, branchName, branches, error: null,
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

  on(loadTransitoSuccess, (state, { items }): MuestrasState => ({ ...state, transito: items, error: null })),
  on(loadTransitoNotModified, (state): MuestrasState => ({ ...state })),
  on(loadTransitoFailure, (state, { error }): MuestrasState => ({ ...state, error })),

  on(resolveRoutingSuccess, (state, { routing }): MuestrasState => ({ ...state, routing, error: null })),
  on(resolveRoutingFailure, (state, { error }): MuestrasState => ({ ...state, error })),

  on(loadWorkspacesSuccess, (state, { workspaces }): MuestrasState => ({ ...state, workspaces, error: null })),
  on(loadWorkspacesFailure, (state, { error }): MuestrasState => ({ ...state, error })),

  on(dispatchTubes, (state): MuestrasState => ({ ...state, dispatchPending: true, error: null })),
  on(dispatchTubesSuccess, (state): MuestrasState => ({ ...state, dispatchPending: false })),
  on(dispatchTubesFailure, (state, { error }): MuestrasState => ({ ...state, dispatchPending: false, error })),

  on(deriveTubes, (state): MuestrasState => ({ ...state, dispatchPending: true, error: null })),
  on(deriveTubesSuccess, (state): MuestrasState => ({ ...state, dispatchPending: false })),
  on(deriveTubesFailure, (state, { error }): MuestrasState => ({ ...state, dispatchPending: false, error })),
);
