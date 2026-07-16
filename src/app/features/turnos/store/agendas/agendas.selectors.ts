import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AgendasState } from './agendas.state';

export const selectAgendasState = createFeatureSelector<AgendasState>('agendas');

export const selectAgendasByBranch = (branchId: number) =>
  createSelector(selectAgendasState, (s) => s.configsByBranch[branchId] ?? []);

export const selectAllConfigsByBranch =
  createSelector(selectAgendasState, (s) => s.configsByBranch);

export const selectAgendasPending =
  createSelector(selectAgendasState, (s) => s.pending);

export const selectAgendasLoadingBranch =
  createSelector(selectAgendasState, (s) => s.loadingBranch);

export const selectAgendasError =
  createSelector(selectAgendasState, (s) => s.error);
