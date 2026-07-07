import { createAction, props } from '@ngrx/store';
// Import directo del submódulo, no del barrel — ver nota en `analitica-metrics.model.ts`.
import { MetricFilter } from '@shared/metrics/models/metric-filter.model';
import { PostanaliticaTabData, PreanaliticaTabData, VolumenTabData } from './analitica-metrics.state';

// Volumen tab -------------------------------------------------------------
export const loadVolumenTab        = createAction('[Analitica Dashboard] Load Volumen Tab', props<{ filter: MetricFilter }>());
export const loadVolumenTabSuccess = createAction('[Analitica Metrics API] Load Volumen Tab Success', props<{ data: VolumenTabData }>());
export const loadVolumenTabFailure = createAction('[Analitica Metrics API] Load Volumen Tab Failure', props<{ error: string }>());

// Preanalítica tab ----------------------------------------------------------
export const loadPreanaliticaTab        = createAction('[Analitica Dashboard] Load Preanalitica Tab', props<{ filter: MetricFilter }>());
export const loadPreanaliticaTabSuccess = createAction('[Analitica Metrics API] Load Preanalitica Tab Success', props<{ data: PreanaliticaTabData }>());
export const loadPreanaliticaTabFailure = createAction('[Analitica Metrics API] Load Preanalitica Tab Failure', props<{ error: string }>());

// Postanalítica tab ---------------------------------------------------------
export const loadPostanaliticaTab        = createAction('[Analitica Dashboard] Load Postanalitica Tab', props<{ filter: MetricFilter }>());
export const loadPostanaliticaTabSuccess = createAction('[Analitica Metrics API] Load Postanalitica Tab Success', props<{ data: PostanaliticaTabData }>());
export const loadPostanaliticaTabFailure = createAction('[Analitica Metrics API] Load Postanalitica Tab Failure', props<{ error: string }>());
