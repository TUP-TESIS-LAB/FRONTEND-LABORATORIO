import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EmpresaState, EMPRESA_FEATURE_KEY } from './empresa.state';

export const selectEmpresaState =
  createFeatureSelector<EmpresaState>(EMPRESA_FEATURE_KEY);

export const selectEmpresaPending = createSelector(
  selectEmpresaState,
  (state) => state.pending,
);
export const selectEmpresaError = createSelector(
  selectEmpresaState,
  (state) => state.error,
);

// Usuarios
export const selectAllUsuarios = createSelector(
  selectEmpresaState,
  (state) => state.usuarios,
);
export const selectUsuariosFilters = createSelector(
  selectEmpresaState,
  (state) => state.usuariosFilters,
);
export const selectUsuariosTotalElements = createSelector(
  selectEmpresaState,
  (state) => state.usuariosTotalElements,
);
export const selectUsuariosTotalPages = createSelector(
  selectEmpresaState,
  (state) => state.usuariosTotalPages,
);
export const selectUsuariosPage = createSelector(
  selectEmpresaState,
  (state) => state.usuariosPage,
);
export const selectUsuariosSize = createSelector(
  selectEmpresaState,
  (state) => state.usuariosSize,
);
export const selectUsuarioSelected = createSelector(
  selectEmpresaState,
  (state) => state.usuarioSelected,
);

// Roles
export const selectAllRoles = createSelector(
  selectEmpresaState,
  (state) => state.roles,
);

// White label
export const selectWhiteLabel = createSelector(
  selectEmpresaState,
  (state) => state.whiteLabel,
);

// Modulos
export const selectAllModulos = createSelector(
  selectEmpresaState,
  (state) => state.modulos,
);

// SMTP
export const selectSmtpConfig = createSelector(
  selectEmpresaState, s => s.smtpConfig,
);
export const selectSmtpPending = createSelector(
  selectEmpresaState, s => s.smtpPending,
);
export const selectSmtpTesting = createSelector(
  selectEmpresaState, s => s.smtpTesting,
);
export const selectSmtpTestResult = createSelector(
  selectEmpresaState, s => s.smtpTestResult,
);
export const selectSmtpTestError = createSelector(
  selectEmpresaState, s => s.smtpTestError,
);
