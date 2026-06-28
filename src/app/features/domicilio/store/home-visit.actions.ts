import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { CreateHomeVisitPayload, HomeVisit } from '../models/home-visit.model';

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
  props<{ error: HttpErrorResponse }>(),
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
  props<{ error: HttpErrorResponse }>(),
);
