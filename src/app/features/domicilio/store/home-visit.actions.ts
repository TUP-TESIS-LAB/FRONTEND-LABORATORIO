import { createAction, props } from '@ngrx/store';
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
