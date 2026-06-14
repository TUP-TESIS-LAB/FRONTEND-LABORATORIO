import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import type { ResultGrid } from '../../models/resultado.model';
import type { BatchDeterminationItem } from '../../services/resultados-api.service';

export const loadGrid = createAction('[Cargar Resultados] Load Grid', props<{ protocolId: number }>());
export const loadGridSuccess = createAction('[Resultados API] Load Grid Success', props<{ grid: ResultGrid }>());
export const loadGridFailure = createAction('[Resultados API] Load Grid Failure', props<{ error: HttpErrorResponse }>());

export const saveResults = createAction('[Cargar Resultados] Save Results', props<{ results: { resultId: number; items: BatchDeterminationItem[] }[] }>());
export const saveResultsSuccess = createAction('[Resultados API] Save Results Success');
export const saveResultsFailure = createAction('[Resultados API] Save Results Failure', props<{ error: HttpErrorResponse }>());

export const markReady = createAction('[Resumen Resultados] Mark Ready', props<{ resultIds: number[] }>());
export const markReadySuccess = createAction('[Resultados API] Mark Ready Success');
export const markReadyFailure = createAction('[Resultados API] Mark Ready Failure', props<{ error: HttpErrorResponse }>());
