import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FinancieroState, FINANCIERO_FEATURE_KEY } from './financiero.state';

export const selectFinancieroState = createFeatureSelector<FinancieroState>(FINANCIERO_FEATURE_KEY);

// ── Caja ─────────────────────────────────────────────────────────────────────
export const selectCajaSlice = createSelector(selectFinancieroState, s => s.caja);

export const selectCajaSession = createSelector(selectCajaSlice, c => c.session);
export const selectCajaActivity = createSelector(selectCajaSlice, c => c.activity);
export const selectCajaLoading = createSelector(selectCajaSlice, c => c.loading);
export const selectCajaError = createSelector(selectCajaSlice, c => c.error);

/** true cuando hay una sesión y su estado es OPEN */
export const selectIsCajaOpen = createSelector(
  selectCajaSession,
  session => session?.status === 'OPEN',
);

/**
 * Saldo actual de la caja.
 * Prioridad: saldoActual (calculado por el backend) → openingAmount (mínimo garantizado).
 */
export const selectCajaSaldo = createSelector(
  selectCajaSession,
  session => session?.saldoActual ?? session?.openingAmount ?? 0,
);
