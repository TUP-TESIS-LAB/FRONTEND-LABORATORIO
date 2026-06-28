import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import { AttentionResponse } from '../../models/atencion.model';

// Load bandeja polleable (ETag / If-None-Match) --------------------------------
export const loadUrgentPending         = createAction('[UrgentPending Dashboard] Load');
export const loadUrgentPendingSuccess  = createAction('[UrgentPending API] Load Success',      props<{ items: AttentionResponse[] }>());
export const loadUrgentPendingNotModified = createAction('[UrgentPending API] Load Not Modified');
export const loadUrgentPendingFailure  = createAction('[UrgentPending API] Load Failure',      props<{ error: HttpErrorResponse }>());

// Resolución: número de autorización -------------------------------------------
export const resolveAuth        = createAction('[UrgentPending] Resolve Authorization', props<{ id: number; authorizationNumber: string | null }>());
export const resolveAuthSuccess = createAction('[UrgentPending API] Resolve Authorization Success', props<{ item: AttentionResponse }>());
export const resolveAuthFailure = createAction('[UrgentPending API] Resolve Authorization Failure', props<{ error: HttpErrorResponse }>());

// Resolución: datos administrativos (médico / plan) ----------------------------
export const resolveDatos        = createAction('[UrgentPending] Resolve Datos Administrativos', props<{ id: number; doctorId?: number; insurancePlanId?: number }>());
export const resolveDatosSuccess = createAction('[UrgentPending API] Resolve Datos Administrativos Success', props<{ item: AttentionResponse }>());
export const resolveDatosFailure = createAction('[UrgentPending API] Resolve Datos Administrativos Failure', props<{ error: HttpErrorResponse }>());

// Resolución: cobro regularizado -----------------------------------------------
export const resolveCobro        = createAction('[UrgentPending] Resolve Cobro', props<{ id: number }>());
export const resolveCobroSuccess = createAction('[UrgentPending API] Resolve Cobro Success', props<{ item: AttentionResponse }>());
export const resolveCobroFailure = createAction('[UrgentPending API] Resolve Cobro Failure', props<{ error: HttpErrorResponse }>());
