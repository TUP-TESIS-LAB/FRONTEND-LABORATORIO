import { createReducer, on } from '@ngrx/store';
import {
  loadPostanaliticaTab, loadPostanaliticaTabFailure, loadPostanaliticaTabSuccess,
  loadPreanaliticaTab, loadPreanaliticaTabFailure, loadPreanaliticaTabSuccess,
  loadVolumenTab, loadVolumenTabFailure, loadVolumenTabSuccess,
} from './analitica-metrics.actions';
import { AnaliticaMetricsState, initialAnaliticaMetricsState } from './analitica-metrics.state';

export const analiticaMetricsReducer = createReducer(
  initialAnaliticaMetricsState,

  on(loadVolumenTab, (s): AnaliticaMetricsState => ({ ...s, volumenLoading: true, volumenError: null })),
  on(loadVolumenTabSuccess, (s, { data }): AnaliticaMetricsState => ({ ...s, volumenLoading: false, volumen: data })),
  on(loadVolumenTabFailure, (s, { error }): AnaliticaMetricsState => ({ ...s, volumenLoading: false, volumenError: error })),

  on(loadPreanaliticaTab, (s): AnaliticaMetricsState => ({ ...s, preanaliticaLoading: true, preanaliticaError: null })),
  on(loadPreanaliticaTabSuccess, (s, { data }): AnaliticaMetricsState => ({ ...s, preanaliticaLoading: false, preanalitica: data })),
  on(loadPreanaliticaTabFailure, (s, { error }): AnaliticaMetricsState => ({ ...s, preanaliticaLoading: false, preanaliticaError: error })),

  on(loadPostanaliticaTab, (s): AnaliticaMetricsState => ({ ...s, postanaliticaLoading: true, postanaliticaError: null })),
  on(loadPostanaliticaTabSuccess, (s, { data }): AnaliticaMetricsState => ({ ...s, postanaliticaLoading: false, postanalitica: data })),
  on(loadPostanaliticaTabFailure, (s, { error }): AnaliticaMetricsState => ({ ...s, postanaliticaLoading: false, postanaliticaError: error })),
);
