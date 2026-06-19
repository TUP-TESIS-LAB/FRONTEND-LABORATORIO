import { createAction, props } from '@ngrx/store';
import { CashSession, SessionActivity, TransactionType } from '../models/financiero.model';

// ── Caja: cargar sesión abierta ──────────────────────────────────────────────
export const loadOpenSession = createAction(
  '[Financiero Caja] Load Open Session',
  props<{ branchId: number }>(),
);
export const loadOpenSessionSuccess = createAction(
  '[Financiero Caja API] Load Open Session Success',
  props<{ session: CashSession }>(),
);
export const sessionNotFound = createAction(
  '[Financiero Caja API] Session Not Found',
);
export const loadOpenSessionFailure = createAction(
  '[Financiero Caja API] Load Open Session Failure',
  props<{ error: string }>(),
);

// ── Caja: actividad de sesión (polleada, ETag/304) ───────────────────────────
export const loadActivity = createAction(
  '[Financiero Caja] Load Activity',
  props<{ sessionId: number }>(),
);
export const loadActivitySuccess = createAction(
  '[Financiero Caja API] Load Activity Success',
  props<{ activity: SessionActivity }>(),
);
export const loadActivityNotModified = createAction(
  '[Financiero Caja API] Load Activity Not Modified',
);
export const loadActivityFailure = createAction(
  '[Financiero Caja API] Load Activity Failure',
  props<{ error: string }>(),
);

// ── Caja: abrir sesión ───────────────────────────────────────────────────────
export const openSession = createAction(
  '[Financiero Caja] Open Session',
  props<{ branchId: number; openingAmount: number }>(),
);
export const openSessionSuccess = createAction(
  '[Financiero Caja API] Open Session Success',
  props<{ session: CashSession }>(),
);
export const openSessionFailure = createAction(
  '[Financiero Caja API] Open Session Failure',
  props<{ error: string }>(),
);

// ── Caja: cerrar sesión ──────────────────────────────────────────────────────
export const closeSession = createAction(
  '[Financiero Caja] Close Session',
  props<{ id: number; declaredAmount: number }>(),
);
export const closeSessionSuccess = createAction(
  '[Financiero Caja API] Close Session Success',
  props<{ session: CashSession }>(),
);
export const closeSessionFailure = createAction(
  '[Financiero Caja API] Close Session Failure',
  props<{ error: string }>(),
);

// ── Caja: registrar movimiento ───────────────────────────────────────────────
export const registerTransaction = createAction(
  '[Financiero Caja] Register Transaction',
  props<{ id: number; body: { branchId: number; type: TransactionType; amount: number; description: string } }>(),
);
export const registerTransactionSuccess = createAction(
  '[Financiero Caja API] Register Transaction Success',
);
export const registerTransactionFailure = createAction(
  '[Financiero Caja API] Register Transaction Failure',
  props<{ error: string }>(),
);
