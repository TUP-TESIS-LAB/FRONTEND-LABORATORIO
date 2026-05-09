import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EmpresaState, EMPRESA_FEATURE_KEY } from './empresa.state';

export const selectEmpresaState =
  createFeatureSelector<EmpresaState>(EMPRESA_FEATURE_KEY);

export const selectAllUsuarios = createSelector(
  selectEmpresaState,
  (state) => state.usuarios
);

export const selectAllRoles = createSelector(
  selectEmpresaState,
  (state) => state.roles
);

export const selectEmpresaPending = createSelector(
  selectEmpresaState,
  (state) => state.pending
);

export const selectEmpresaError = createSelector(
  selectEmpresaState,
  (state) => state.error
);
