import { createAction, props } from '@ngrx/store';
import { CreateHomeVisitPayload, HomeVisit, HomeVisitOutcomeReason } from '../models/home-visit.model';

// ── Listar visitas ────────────────────────────────────────────────────────────
export const loadHomeVisits = createAction(
  '[Domicilio Agenda] Load Home Visits',
  props<{ branchId: number }>(),
);
export const loadHomeVisitsSuccess = createAction(
  '[Domicilio API] Load Home Visits Success',
  props<{ visits: HomeVisit[] }>(),
);
export const loadHomeVisitsFailure = createAction(
  '[Domicilio API] Load Home Visits Failure',
  props<{ error: string }>(),
);

// ── Crear visita ──────────────────────────────────────────────────────────────
export const createHomeVisit = createAction(
  '[Domicilio Nueva Visita] Create Home Visit',
  props<{ payload: CreateHomeVisitPayload }>(),
);
export const createHomeVisitSuccess = createAction(
  '[Domicilio API] Create Home Visit Success',
  props<{ id: number }>(),
);
export const createHomeVisitFailure = createAction(
  '[Domicilio API] Create Home Visit Failure',
  props<{ error: string }>(),
);

// ── Ruta del día (polleada, ETag/304) ─────────────────────────────────────────
export const loadMyRoute = createAction(
  '[Domicilio Ruta] Load My Route',
  props<{ date?: string }>(),
);
export const loadMyRouteSuccess = createAction(
  '[Domicilio API] Load My Route Success',
  props<{ visits: HomeVisit[] }>(),
);
export const loadMyRouteNotModified = createAction(
  '[Domicilio API] Load My Route Not Modified',
);
export const loadMyRouteFailure = createAction(
  '[Domicilio API] Load My Route Failure',
  props<{ error: string }>(),
);

// ── Detalle de visita ─────────────────────────────────────────────────────────
export const loadVisitDetail = createAction(
  '[Domicilio Detalle] Load Visit Detail',
  props<{ id: number }>(),
);
export const loadVisitDetailSuccess = createAction(
  '[Domicilio API] Load Visit Detail Success',
  props<{ visit: HomeVisit }>(),
);
export const loadVisitDetailFailure = createAction(
  '[Domicilio API] Load Visit Detail Failure',
  props<{ error: string }>(),
);

// ── Acciones del extractor ────────────────────────────────────────────────────
export const markExtracted = createAction(
  '[Domicilio Extractor] Mark Extracted',
  props<{ id: number }>(),
);
export const markExtractedSuccess = createAction(
  '[Domicilio API] Mark Extracted Success',
  props<{ visit: HomeVisit }>(),
);
export const markExtractedFailure = createAction(
  '[Domicilio API] Mark Extracted Failure',
  props<{ error: string }>(),
);

export const markOutcome = createAction(
  '[Domicilio Extractor] Mark Outcome',
  props<{ id: number; reason: HomeVisitOutcomeReason }>(),
);
export const markOutcomeSuccess = createAction(
  '[Domicilio API] Mark Outcome Success',
  props<{ visit: HomeVisit }>(),
);
export const markOutcomeFailure = createAction(
  '[Domicilio API] Mark Outcome Failure',
  props<{ error: string }>(),
);

export const rescheduleVisit = createAction(
  '[Domicilio Extractor] Reschedule Visit',
  props<{ id: number }>(),
);
export const rescheduleVisitSuccess = createAction(
  '[Domicilio API] Reschedule Visit Success',
  props<{ visit: HomeVisit }>(),
);
export const rescheduleVisitFailure = createAction(
  '[Domicilio API] Reschedule Visit Failure',
  props<{ error: string }>(),
);
