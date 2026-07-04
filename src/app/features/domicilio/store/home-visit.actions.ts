import { createAction, props } from '@ngrx/store';
import {
  BreakageReason,
  CreateHomeVisitPayload,
  CustodyEvent,
  HomeVisit,
  HomeVisitOutcomeReason,
  PreparedLabel,
} from '../models/home-visit.model';

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

// ── Preparar rótulos (secretaría) ─────────────────────────────────────────────
export const prepareLabels = createAction(
  '[Domicilio Secretaria] Prepare Labels',
  props<{ id: number }>(),
);
export const prepareLabelsSuccess = createAction(
  '[Domicilio API] Prepare Labels Success',
  props<{ visit: HomeVisit; labels: PreparedLabel[] }>(),
);
export const prepareLabelsFailure = createAction(
  '[Domicilio API] Prepare Labels Failure',
  props<{ error: string }>(),
);

// ── Acciones del extractor ────────────────────────────────────────────────────
export const markExtracted = createAction(
  '[Domicilio Extractor] Mark Extracted',
  props<{ id: number; scannedBarcode: string }>(),
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

// ── En tránsito (extractor) ────────────────────────────────────────────────────
export const markInTransit = createAction(
  '[Domicilio Extractor] Mark In Transit',
  props<{ id: number }>(),
);
export const markInTransitSuccess = createAction(
  '[Domicilio API] Mark In Transit Success',
  props<{ visit: HomeVisit }>(),
);
export const markInTransitFailure = createAction(
  '[Domicilio API] Mark In Transit Failure',
  props<{ error: string }>(),
);

// ── Reportar rotura (extractor / secretaría) ────────────────────────────────────
export const markBroken = createAction(
  '[Domicilio Rotura] Mark Broken',
  props<{ id: number; reason: BreakageReason }>(),
);
export const markBrokenSuccess = createAction(
  '[Domicilio API] Mark Broken Success',
  props<{ visit: HomeVisit }>(),
);
export const markBrokenFailure = createAction(
  '[Domicilio API] Mark Broken Failure',
  props<{ error: string }>(),
);

// ── Recepcionar (secretaría) ────────────────────────────────────────────────────
export const receiveVisit = createAction(
  '[Domicilio Recepción] Receive Visit',
  props<{ id: number }>(),
);
export const receiveVisitSuccess = createAction(
  '[Domicilio API] Receive Visit Success',
  props<{ visit: HomeVisit }>(),
);
export const receiveVisitFailure = createAction(
  '[Domicilio API] Receive Visit Failure',
  props<{ error: string }>(),
);

// ── Re-extraer (secretaría) ─────────────────────────────────────────────────────
export const reExtractVisit = createAction(
  '[Domicilio Recepción] Re-Extract Visit',
  props<{ id: number }>(),
);
export const reExtractVisitSuccess = createAction(
  '[Domicilio API] Re-Extract Visit Success',
  props<{ visit: HomeVisit }>(),
);
export const reExtractVisitFailure = createAction(
  '[Domicilio API] Re-Extract Visit Failure',
  props<{ error: string }>(),
);

// ── Cadena de custodia (timeline, polleada ETag/304) ────────────────────────────
export const loadCustody = createAction(
  '[Domicilio Custodia] Load Custody',
  props<{ id: number }>(),
);
export const loadCustodySuccess = createAction(
  '[Domicilio API] Load Custody Success',
  props<{ events: CustodyEvent[] }>(),
);
export const loadCustodyNotModified = createAction(
  '[Domicilio API] Load Custody Not Modified',
);
export const loadCustodyFailure = createAction(
  '[Domicilio API] Load Custody Failure',
  props<{ error: string }>(),
);
