import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FinancieroState, FINANCIERO_FEATURE_KEY } from './financiero.state';

export const selectFinancieroState = createFeatureSelector<FinancieroState>(FINANCIERO_FEATURE_KEY);

// ── Caja ─────────────────────────────────────────────────────────────────────
export const selectCajaSlice = createSelector(selectFinancieroState, s => s.caja);

export const selectCajaSession = createSelector(selectCajaSlice, c => c.session);
export const selectCajaActivity = createSelector(selectCajaSlice, c => c.activity);
export const selectCajaLoading = createSelector(selectCajaSlice, c => c.loading);
export const selectCajaError = createSelector(selectCajaSlice, c => c.error);
export const selectCashRegisters = createSelector(selectCajaSlice, c => c.registers);
export const selectCashRegistersLoading = createSelector(selectCajaSlice, c => c.registersLoading);

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

// ── Otros medios (sucursal + día) ──────────────────────────────────────────────
export const selectOtrosSlice = createSelector(selectFinancieroState, s => s.otros);
export const selectOtrosMedia = createSelector(selectOtrosSlice, o => o.data);
export const selectOtrosRows = createSelector(selectOtrosMedia, d => d?.rows ?? []);
export const selectOtrosTotal = createSelector(selectOtrosMedia, d => d?.total ?? 0);
export const selectOtrosCount = createSelector(selectOtrosMedia, d => d?.count ?? 0);
export const selectOtrosLoading = createSelector(selectOtrosSlice, o => o.loading);
export const selectOtrosError = createSelector(selectOtrosSlice, o => o.error);

// ── Feed de movimientos multi-sucursal (KAN-161) ────────────────────────────
export const selectMovimientosSlice = createSelector(selectFinancieroState, s => s.movimientos);
export const selectMovimientosData = createSelector(selectMovimientosSlice, s => s.data);
export const selectMovimientosRows = createSelector(selectMovimientosData, d => d?.movements ?? []);
export const selectMovimientosBranches = createSelector(selectMovimientosData, d => d?.branches ?? []);
export const selectMovimientosTotals = createSelector(selectMovimientosData, d => d?.totals ?? null);
export const selectMovimientosLoading = createSelector(selectMovimientosSlice, s => s.loading);
export const selectMovimientosError = createSelector(selectMovimientosSlice, s => s.error);

// ── Cuentas destino (bank-accounts) ────────────────────────────────────────────
export const selectCuentasSlice = createSelector(selectFinancieroState, s => s.cuentas);
export const selectBankAccounts = createSelector(selectCuentasSlice, c => c.list);
export const selectBankAccountsLoading = createSelector(selectCuentasSlice, c => c.loading);
export const selectBankAccountsSaving = createSelector(selectCuentasSlice, c => c.saving);
export const selectBankAccountsError = createSelector(selectCuentasSlice, c => c.error);

// ── Cobros ────────────────────────────────────────────────────────────────────
export const selectCobrosSlice = createSelector(selectFinancieroState, s => s.cobros);

export const selectCobrosList = createSelector(selectCobrosSlice, c => c.list);
export const selectCobrosLoading = createSelector(selectCobrosSlice, c => c.loading);
export const selectCobrosError = createSelector(selectCobrosSlice, c => c.error);
export const selectCobroSelected = createSelector(selectCobrosSlice, c => c.selected);

// ── Cobro (registrar pago) ────────────────────────────────────────────────────
export const selectCobroSlice = createSelector(selectFinancieroState, s => s.cobro);
export const selectCobroSubmitting = createSelector(selectCobroSlice, c => c.submitting);
export const selectCobroResult = createSelector(selectCobroSlice, c => c.result);
export const selectCobroError = createSelector(selectCobroSlice, c => c.error);

// ── Config fiscal ─────────────────────────────────────────────────────────────
export const selectConfigSlice = createSelector(selectFinancieroState, s => s.config);

export const selectFiscalConfig = createSelector(selectConfigSlice, c => c.current);
export const selectFiscalSaving = createSelector(selectConfigSlice, c => c.saving);
export const selectFiscalConfigError = createSelector(selectConfigSlice, c => c.error);
