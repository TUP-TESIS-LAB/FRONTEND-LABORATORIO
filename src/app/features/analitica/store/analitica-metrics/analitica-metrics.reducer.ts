import { createReducer, on } from '@ngrx/store';
import {
  loadPostanaliticaTab, loadPostanaliticaTabFailure, loadPostanaliticaTabSuccess,
  loadPreanaliticaTab, loadPreanaliticaTabFailure, loadPreanaliticaTabSuccess,
  loadVolumenTab, loadVolumenTabFailure, loadVolumenTabSuccess,
} from './analitica-metrics.actions';
import {
  AnaliticaMetricsState, initialAnaliticaMetricsState,
  initialPostanaliticaTabData, initialPreanaliticaTabData, initialVolumenTabData,
} from './analitica-metrics.state';

export const analiticaMetricsReducer = createReducer(
  initialAnaliticaMetricsState,

  // `*Loading` solo se prende en la primera carga de cada tab (mientras el state todavía
  // es la referencia inicial). Los ticks de polling y los cambios de filtro posteriores
  // NO vuelven a mostrar el skeleton — los datos se actualizan en el lugar (el effect ya
  // resuelve los 304 por campo) y Chart.js anima la transición en vez de remontar el canvas.
  on(loadVolumenTab, (s): AnaliticaMetricsState => (
    { ...s, volumenLoading: s.volumen === initialVolumenTabData, volumenError: null }
  )),
  on(loadVolumenTabSuccess, (s, { data }): AnaliticaMetricsState => ({ ...s, volumenLoading: false, volumen: data })),
  on(loadVolumenTabFailure, (s, { error }): AnaliticaMetricsState => ({ ...s, volumenLoading: false, volumenError: error })),

  on(loadPreanaliticaTab, (s): AnaliticaMetricsState => (
    { ...s, preanaliticaLoading: s.preanalitica === initialPreanaliticaTabData, preanaliticaError: null }
  )),
  on(loadPreanaliticaTabSuccess, (s, { data }): AnaliticaMetricsState => ({ ...s, preanaliticaLoading: false, preanalitica: data })),
  on(loadPreanaliticaTabFailure, (s, { error }): AnaliticaMetricsState => ({ ...s, preanaliticaLoading: false, preanaliticaError: error })),

  on(loadPostanaliticaTab, (s): AnaliticaMetricsState => (
    { ...s, postanaliticaLoading: s.postanalitica === initialPostanaliticaTabData, postanaliticaError: null }
  )),
  on(loadPostanaliticaTabSuccess, (s, { data }): AnaliticaMetricsState => ({ ...s, postanaliticaLoading: false, postanalitica: data })),
  on(loadPostanaliticaTabFailure, (s, { error }): AnaliticaMetricsState => ({ ...s, postanaliticaLoading: false, postanaliticaError: error })),
);
