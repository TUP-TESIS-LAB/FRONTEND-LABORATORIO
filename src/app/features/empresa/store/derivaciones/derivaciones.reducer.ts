import { createReducer, on } from '@ngrx/store';

import { DerivacionesState, initialDerivacionesState } from './derivaciones.state';
import {
  enter, setState, create, update, toggle,
  loadSuccess, loadFailure, mutateSuccess, mutateFailure,
} from './derivaciones.actions';

const setPending = (state: DerivacionesState): DerivacionesState => ({
  ...state,
  pending: true,
  error: null,
});
const setFailure = (state: DerivacionesState, error: string): DerivacionesState => ({
  ...state,
  pending: false,
  error,
});

export const derivacionesReducer = createReducer(
  initialDerivacionesState,

  // ---- intent → pending ----
  on(enter, setPending),
  on(create, setPending),
  on(update, setPending),
  on(toggle, setPending),

  // ---- cambio de segmento (dispara reload) ----
  on(setState, (state, { state: segment }): DerivacionesState => ({
    ...state,
    state: segment,
    pending: true,
    error: null,
  })),

  // ---- success ----
  on(loadSuccess, (state, { labs }): DerivacionesState => ({
    ...state,
    labs,
    pending: false,
    error: null,
  })),
  on(mutateSuccess, (state): DerivacionesState => ({ ...state, pending: false })),

  // ---- failure ----
  on(loadFailure, (state, { error }) => setFailure(state, error)),
  on(mutateFailure, (state, { error }) => setFailure(state, error)),
);
