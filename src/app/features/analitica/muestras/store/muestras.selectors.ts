import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MuestrasState, MUESTRAS_FEATURE_KEY } from './muestras.state';

export const selectMuestrasState = createFeatureSelector<MuestrasState>(MUESTRAS_FEATURE_KEY);

export const selectMuestrasBranchId = createSelector(selectMuestrasState, s => s.branchId);
export const selectMuestrasBranchName = createSelector(selectMuestrasState, s => s.branchName);
export const selectMuestrasBranches = createSelector(selectMuestrasState, s => s.branches);
export const selectRecoleccionItems = createSelector(selectMuestrasState, s => s.recoleccion);
export const selectMuestrasPending = createSelector(selectMuestrasState, s => s.pending);
export const selectMuestrasTransitionPending = createSelector(selectMuestrasState, s => s.transitionPending);
export const selectMuestrasError = createSelector(selectMuestrasState, s => s.error);

export const selectTransitoItems = createSelector(selectMuestrasState, s => s.transito);
export const selectRouting = createSelector(selectMuestrasState, s => s.routing);
export const selectWorkspaces = createSelector(selectMuestrasState, s => s.workspaces);
export const selectDispatchPending = createSelector(selectMuestrasState, s => s.dispatchPending);
export const selectDescarteItems = createSelector(selectMuestrasState, s => s.descarte);
export const selectDescartadasItems = createSelector(selectMuestrasState, s => s.descartadas);
export const selectProcesamientoItems = createSelector(selectMuestrasState, s => s.procesamiento);
