import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import {
  AwaitingExtractionItem,
  BoxAssignment,
  BoxOccupancyItem,
  BranchExtractor,
  BranchOption,
  ExtractionStats,
  InExtractionItem,
} from '../../models/extraction.model';

// --- Refresh trigger -------------------------------------------------------
export const refreshAll = createAction('[Extraction Queue] Refresh All');

// --- Branches --------------------------------------------------------------
export const loadBranches = createAction('[Extraction Queue] Load Branches');
export const loadBranchesSuccess = createAction(
  '[Extraction API] Load Branches Success',
  props<{ items: BranchOption[] }>(),
);
export const loadBranchesNotModified = createAction(
  '[Extraction API] Load Branches Not Modified',
);
export const loadBranchesFailure = createAction(
  '[Extraction API] Load Branches Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const setSelectedBranch = createAction(
  '[Extraction Queue] Set Selected Branch',
  props<{ branchId: number | null }>(),
);

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

// --- InProgress (todas las en curso de la sucursal) -----------------------
export const loadInProgress = createAction('[Extraction Queue] Load In Progress');
export const loadInProgressSuccess = createAction(
  '[Extraction API] Load In Progress Success',
  props<{ items: InExtractionItem[] }>(),
);
export const loadInProgressNotModified = createAction(
  '[Extraction API] Load In Progress Not Modified',
);
export const loadInProgressFailure = createAction(
  '[Extraction API] Load In Progress Failure',
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

// --- Box occupancy ---------------------------------------------------------
export const loadOccupancy = createAction('[Extraction Queue] Load Occupancy');
export const loadOccupancySuccess = createAction(
  '[Extraction API] Load Occupancy Success',
  props<{ items: BoxOccupancyItem[] }>(),
);
export const loadOccupancyNotModified = createAction(
  '[Extraction API] Load Occupancy Not Modified',
);
export const loadOccupancyFailure = createAction(
  '[Extraction API] Load Occupancy Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Box assignments -------------------------------------------------------
export const loadBoxAssignments = createAction('[Extraction Queue] Load Box Assignments');
export const loadBoxAssignmentsSuccess = createAction(
  '[Extraction API] Load Box Assignments Success',
  props<{ items: BoxAssignment[] }>(),
);
export const loadBoxAssignmentsNotModified = createAction(
  '[Extraction API] Load Box Assignments Not Modified',
);
export const loadBoxAssignmentsFailure = createAction(
  '[Extraction API] Load Box Assignments Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const saveBoxAssignments = createAction(
  '[Extraction Queue] Save Box Assignments',
  props<{ boxes: { boxNumber: number; extractorUserId: number | null }[] }>(),
);
export const saveBoxAssignmentsSuccess = createAction(
  '[Extraction API] Save Box Assignments Success',
  props<{ items: BoxAssignment[] }>(),
);
export const saveBoxAssignmentsFailure = createAction(
  '[Extraction API] Save Box Assignments Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Branch extractors -----------------------------------------------------
export const loadBranchExtractors = createAction('[Extraction Queue] Load Branch Extractors');
export const loadBranchExtractorsSuccess = createAction(
  '[Extraction API] Load Branch Extractors Success',
  props<{ items: BranchExtractor[] }>(),
);
export const loadBranchExtractorsNotModified = createAction(
  '[Extraction API] Load Branch Extractors Not Modified',
);
export const loadBranchExtractorsFailure = createAction(
  '[Extraction API] Load Branch Extractors Failure',
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
  props<{ id: number; boxNumber: number; branchId: number }>(),
);
export const assignExtractorSuccess = createAction(
  '[Extraction API] Assign Extractor Success',
  props<{ attentionId: number; boxNumber: number; extractorFullName: string }>(),
);
export const assignExtractorFailure = createAction(
  '[Extraction API] Assign Extractor Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const unassignExtraction = createAction(
  '[Extraction Queue] Unassign Extraction',
  props<{ id: number }>(),
);
export const unassignExtractionSuccess = createAction(
  '[Extraction API] Unassign Extraction Success',
  props<{ id: number }>(),
);
export const unassignExtractionFailure = createAction(
  '[Extraction API] Unassign Extraction Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const cancelExtraction = createAction(
  '[Extraction Queue] Cancel Extraction',
  props<{ id: number; reason: string }>(),
);
export const cancelExtractionSuccess = createAction(
  '[Extraction API] Cancel Extraction Success',
  props<{ id: number }>(),
);
export const cancelExtractionFailure = createAction(
  '[Extraction API] Cancel Extraction Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const cancelAttention = createAction(
  '[Extraction Queue] Cancel Attention',
  props<{ id: number; reason: string }>(),
);
export const cancelAttentionSuccess = createAction(
  '[Extraction API] Cancel Attention Success',
  props<{ id: number }>(),
);
export const cancelAttentionFailure = createAction(
  '[Extraction API] Cancel Attention Failure',
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
