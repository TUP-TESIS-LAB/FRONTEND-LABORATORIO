import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BranchTotemConfigState } from './branch-totem-config.state';

// El feature `branchTotemConfig` se registra dentro del lazy turnos route.
// El sidebar (root) puede leer el selector antes de que la ruta se cargue,
// momento en el cual la slice no existe (state === undefined). Tipamos como
// posiblemente undefined y devolvemos null en ese caso.
export const selectBranchTotemConfigState =
  createFeatureSelector<BranchTotemConfigState | undefined>('branchTotemConfig');

export const selectBranchTotemEnabled = createSelector(
  selectBranchTotemConfigState,
  (s) => s?.enabled ?? null,
);

export const selectBranchTotemLoading = createSelector(
  selectBranchTotemConfigState,
  (s) => s?.loading ?? false,
);
