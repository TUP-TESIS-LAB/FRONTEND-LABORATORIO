import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { Pago, Cobertura, Movimiento } from '../models/financiero.model';

// Pagos
export const loadPagos = createAction('[Financiero Page] Load Pagos');
export const loadPagosSuccess = createAction(
  '[Financiero API] Load Pagos Success',
  props<{ pagos: Pago[] }>()
);
export const loadPagosFailure = createAction(
  '[Financiero API] Load Pagos Failure',
  props<{ error: HttpErrorResponse }>()
);

// Coberturas
export const loadCoberturas = createAction('[Financiero Page] Load Coberturas');
export const loadCoberturasSuccess = createAction(
  '[Financiero API] Load Coberturas Success',
  props<{ coberturas: Cobertura[] }>()
);
export const loadCoberturasFailure = createAction(
  '[Financiero API] Load Coberturas Failure',
  props<{ error: HttpErrorResponse }>()
);

// Movimientos
export const loadMovimientos = createAction('[Financiero Page] Load Movimientos');
export const loadMovimientosSuccess = createAction(
  '[Financiero API] Load Movimientos Success',
  props<{ movimientos: Movimiento[] }>()
);
export const loadMovimientosFailure = createAction(
  '[Financiero API] Load Movimientos Failure',
  props<{ error: HttpErrorResponse }>()
);
