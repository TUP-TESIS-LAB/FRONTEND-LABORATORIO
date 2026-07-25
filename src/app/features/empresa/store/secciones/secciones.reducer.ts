import { createReducer, on } from '@ngrx/store';

import { SeccionesState, initialSeccionesState } from './secciones.state';
import {
  loadSecciones, loadSeccionesSuccess, loadSeccionesFailure,
  loadCountBySection, loadCountBySectionSuccess, loadCountBySectionFailure,
  loadUnassignedCount, loadUnassignedCountSuccess, loadUnassignedCountFailure,
  addSeccion, addSeccionSuccess, addSeccionFailure,
  updateSeccion, updateSeccionSuccess, updateSeccionFailure,
  deleteSeccion, deleteSeccionSuccess, deleteSeccionFailure,
} from './secciones.actions';

const setPending = (state: SeccionesState): SeccionesState => ({
  ...state,
  pending: true,
  error: null,
});
const setFailure = (state: SeccionesState, error: SeccionesState['error']): SeccionesState => ({
  ...state,
  pending: false,
  error,
});

export const seccionesReducer = createReducer(
  initialSeccionesState,

  // ---- intent → pending ----
  on(loadSecciones, setPending),
  on(loadCountBySection, setPending),
  on(loadUnassignedCount, setPending),
  on(addSeccion, setPending),
  on(updateSeccion, setPending),
  on(deleteSeccion, setPending),

  // ---- success ----
  on(loadSeccionesSuccess, (state, { items }): SeccionesState => ({
    ...state,
    secciones: items,
    pending: false,
    error: null,
  })),
  on(loadCountBySectionSuccess, (state, { countMap }): SeccionesState => ({
    ...state,
    countMap,
    pending: false,
    error: null,
  })),
  on(loadUnassignedCountSuccess, (state, { count }): SeccionesState => ({
    ...state,
    unassignedCount: count,
    pending: false,
    error: null,
  })),
  on(addSeccionSuccess, (state): SeccionesState => ({ ...state, pending: false })),
  on(updateSeccionSuccess, (state): SeccionesState => ({ ...state, pending: false })),
  on(deleteSeccionSuccess, (state, { id }): SeccionesState => ({
    ...state,
    secciones: state.secciones.filter((s) => s.id !== id),
    pending: false,
    error: null,
  })),

  // ---- failure ----
  on(loadSeccionesFailure, (state, { error }) => setFailure(state, error)),
  on(loadCountBySectionFailure, (state, { error }) => setFailure(state, error)),
  on(loadUnassignedCountFailure, (state, { error }) => setFailure(state, error)),
  on(addSeccionFailure, (state, { error }) => setFailure(state, error)),
  on(updateSeccionFailure, (state, { error }) => setFailure(state, error)),
  on(deleteSeccionFailure, (state, { error }) => setFailure(state, error)),
);
