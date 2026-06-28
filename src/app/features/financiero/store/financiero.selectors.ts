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

// ── Liquidaciones ─────────────────────────────────────────────────────────────
export const selectLiqSlice = createSelector(selectFinancieroState, s => s.liquidaciones);

export const selectLiqList = createSelector(selectLiqSlice, l => l.list);
export const selectLiqListLoading = createSelector(selectLiqSlice, l => l.listLoading);
export const selectLiqListError = createSelector(selectLiqSlice, l => l.listError);

export const selectLiqSelected = createSelector(selectLiqSlice, l => l.selected);
export const selectLiqDetailLoading = createSelector(selectLiqSlice, l => l.detailLoading);
export const selectLiqDetailError = createSelector(selectLiqSlice, l => l.detailError);

export const selectLiqGenerating = createSelector(selectLiqSlice, l => l.generating);
export const selectLiqGenerateError = createSelector(selectLiqSlice, l => l.generateError);

export const selectLiqLifecycleInProgress = createSelector(selectLiqSlice, l => l.lifecycleInProgress);
export const selectLiqLifecycleError = createSelector(selectLiqSlice, l => l.lifecycleError);

export const selectLiqPending = createSelector(selectLiqSlice, l => l.pending);
export const selectLiqPendingLoading = createSelector(selectLiqSlice, l => l.pendingLoading);

export const selectLiqInsurers = createSelector(selectLiqSlice, l => l.insurers);

/** Map insurerId → nombre, para resolver nombres sin exponer IDs. */
export const selectLiqInsurersIndex = createSelector(
  selectLiqInsurers,
  insurers => new Map<number, string>(insurers.map(i => [i.id, i.name])),
);

export const selectLiqInsurerPlanIds = createSelector(selectLiqSlice, l => l.selectedInsurerPlanIds);

export const selectLiqPreviewDetail = createSelector(selectLiqSlice, l => l.previewDetail);
export const selectLiqPreviewLoading = createSelector(selectLiqSlice, l => l.previewLoading);
export const selectLiqPreviewError = createSelector(selectLiqSlice, l => l.previewError);
