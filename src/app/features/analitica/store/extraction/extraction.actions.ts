import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import {
  AwaitingExtractionItem,
  ExtractionStats,
  InExtractionItem,
} from '../../models/extraction.model';

// --- Refresh trigger -------------------------------------------------------
export const refreshAll = createAction('[Extraction Queue] Refresh All');

// --- Awaiting --------------------------------------------------------------
export const loadAwaiting = createAction('[Extraction Queue] Load Awaiting');
export const loadAwaitingSuccess = createAction(
  '[Extraction API] Load Awaiting Success',
  props<{ items: AwaitingExtractionItem[] }>(),
);
export const loadAwaitingNotModified = createAction(
  '[Extraction API] Load Awaiting Not Modified',
);
export const loadAwaitingFailure = createAction(
  '[Extraction API] Load Awaiting Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Mine -----------------------------------------------------------------
export const loadMine = createAction('[Extraction Queue] Load Mine');
export const loadMineSuccess = createAction(
  '[Extraction API] Load Mine Success',
  props<{ items: InExtractionItem[] }>(),
);
export const loadMineNotModified = createAction(
  '[Extraction API] Load Mine Not Modified',
);
export const loadMineFailure = createAction(
  '[Extraction API] Load Mine Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Stats ----------------------------------------------------------------
export const loadStats = createAction('[Extraction Queue] Load Stats');
export const loadStatsSuccess = createAction(
  '[Extraction API] Load Stats Success',
  props<{ stats: ExtractionStats }>(),
);
export const loadStatsNotModified = createAction(
  '[Extraction API] Load Stats Not Modified',
);
export const loadStatsFailure = createAction(
  '[Extraction API] Load Stats Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- UI filter ------------------------------------------------------------
export const setSearch = createAction(
  '[Extraction Queue] Set Search',
  props<{ search: string }>(),
);

// --- Mutations ------------------------------------------------------------
export const assignExtractor = createAction(
  '[Extraction Queue] Assign Extractor',
  props<{ id: number; box: number }>(),
);
export const assignExtractorSuccess = createAction(
  '[Extraction API] Assign Extractor Success',
  props<{ id: number }>(),
);
export const assignExtractorFailure = createAction(
  '[Extraction API] Assign Extractor Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const cancelExtraction = createAction(
  '[Extraction Queue] Cancel Extraction',
  props<{ id: number }>(),
);
export const cancelExtractionSuccess = createAction(
  '[Extraction API] Cancel Extraction Success',
  props<{ id: number }>(),
);
export const cancelExtractionFailure = createAction(
  '[Extraction API] Cancel Extraction Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const endExtraction = createAction(
  '[Extraction Queue] End Extraction',
  props<{ id: number }>(),
);
export const endExtractionSuccess = createAction(
  '[Extraction API] End Extraction Success',
  props<{ id: number }>(),
);
export const endExtractionFailure = createAction(
  '[Extraction API] End Extraction Failure',
  props<{ error: HttpErrorResponse }>(),
);
