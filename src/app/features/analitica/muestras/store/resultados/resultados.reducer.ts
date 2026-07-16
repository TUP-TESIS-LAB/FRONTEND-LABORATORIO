import { createReducer, on } from '@ngrx/store';
import { initialResultadosState, ResultadosState } from './resultados.state';
import {
  loadGrid, loadGridSuccess, loadGridFailure,
  saveResults, saveResultsSuccess, saveResultsFailure,
  markReady, markReadySuccess, markReadyFailure,
} from './resultados.actions';

export const resultadosReducer = createReducer(
  initialResultadosState,
  on(loadGrid, (s): ResultadosState => ({ ...s, loading: true, error: null })),
  on(loadGridSuccess, (s, { grid }): ResultadosState => ({ ...s, grid, loading: false, error: null })),
  on(loadGridFailure, (s, { error }): ResultadosState => ({ ...s, loading: false, error })),
  on(saveResults, (s): ResultadosState => ({ ...s, saving: true, error: null })),
  on(saveResultsSuccess, (s): ResultadosState => ({ ...s, saving: false })),
  on(saveResultsFailure, (s, { error }): ResultadosState => ({ ...s, saving: false, error })),
  on(markReady, (s): ResultadosState => ({ ...s, saving: true, error: null })),
  on(markReadySuccess, (s): ResultadosState => ({ ...s, saving: false })),
  on(markReadyFailure, (s, { error }): ResultadosState => ({ ...s, saving: false, error })),
);
