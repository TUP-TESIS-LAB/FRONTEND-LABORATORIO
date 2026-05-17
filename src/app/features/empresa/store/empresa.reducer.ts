import { createReducer, on } from '@ngrx/store';
import { EmpresaState, initialEmpresaState } from './empresa.state';
import {
  loadUsuarios, loadUsuariosSuccess, loadUsuariosFailure,
  setUsuariosFilters,
  loadUsuario, loadUsuarioSuccess, loadUsuarioFailure, clearUsuarioSelected,
  addUsuario, addUsuarioSuccess, addUsuarioFailure,
  updateUsuario, updateUsuarioSuccess, updateUsuarioFailure,
  toggleUsuarioStatus, toggleUsuarioStatusSuccess, toggleUsuarioStatusFailure,
  resendUsuarioInvite, resendUsuarioInviteSuccess, resendUsuarioInviteFailure,
  regenerateFirstLoginToken, regenerateFirstLoginTokenSuccess, regenerateFirstLoginTokenFailure,
  loadRoles, loadRolesSuccess, loadRolesFailure,
  loadWhiteLabel, loadWhiteLabelSuccess, loadWhiteLabelFailure,
  saveWhiteLabel, saveWhiteLabelSuccess, saveWhiteLabelFailure,
  loadModulos, loadModulosSuccess, loadModulosFailure,
  toggleModulo, toggleModuloSuccess, toggleModuloFailure,
  loadSmtpConfig, loadSmtpConfigSuccess, loadSmtpConfigFailure,
  saveSmtpConfig, saveSmtpConfigSuccess, saveSmtpConfigFailure,
  sendTestEmail, sendTestEmailSuccess, sendTestEmailFailure,
  clearTestEmailResult,
} from './empresa.actions';

const setPending = (state: EmpresaState): EmpresaState => ({
  ...state,
  pending: true,
  error: null,
});
const setFailure = (state: EmpresaState, error: EmpresaState['error']): EmpresaState => ({
  ...state,
  pending: false,
  error,
});

export const empresaReducer = createReducer(
  initialEmpresaState,

  // ---- intent → pending ----
  on(loadUsuarios, setPending),
  on(loadUsuario, setPending),
  on(addUsuario, setPending),
  on(updateUsuario, setPending),
  on(toggleUsuarioStatus, setPending),
  on(resendUsuarioInvite, setPending),
  on(regenerateFirstLoginToken, setPending),
  on(loadRoles, setPending),
  on(loadWhiteLabel, setPending),
  on(saveWhiteLabel, setPending),
  on(loadModulos, setPending),
  on(toggleModulo, setPending),

  // ---- usuarios success ----
  on(loadUsuariosSuccess, (state, { result }): EmpresaState => ({
    ...state,
    usuarios: result.content,
    usuariosPage: result.page,
    usuariosSize: result.size,
    usuariosTotalElements: result.totalElements,
    usuariosTotalPages: result.totalPages,
    pending: false,
    error: null,
  })),
  on(setUsuariosFilters, (state, { patch }): EmpresaState => ({
    ...state,
    usuariosFilters: { ...state.usuariosFilters, ...patch },
  })),
  on(loadUsuarioSuccess, (state, { usuario }): EmpresaState => ({
    ...state,
    usuarioSelected: usuario,
    pending: false,
    error: null,
  })),
  on(clearUsuarioSelected, (state): EmpresaState => ({
    ...state,
    usuarioSelected: null,
  })),
  // No tocamos la lista — un effect dispara loadUsuarios con los filtros
  // actuales para refrescar la página activa.
  on(addUsuarioSuccess, (state): EmpresaState => ({
    ...state,
    pending: false,
    error: null,
  })),
  on(updateUsuarioSuccess, (state, { usuario }): EmpresaState => ({
    ...state,
    usuarios: state.usuarios.map((u) => (u.id === usuario.id ? usuario : u)),
    usuarioSelected: state.usuarioSelected?.id === usuario.id ? usuario : state.usuarioSelected,
    pending: false,
    error: null,
  })),
  on(toggleUsuarioStatusSuccess, (state, { usuario }): EmpresaState => ({
    ...state,
    usuarios: state.usuarios.map((u) => (u.id === usuario.id ? usuario : u)),
    usuarioSelected: state.usuarioSelected?.id === usuario.id ? usuario : state.usuarioSelected,
    pending: false,
    error: null,
  })),
  on(resendUsuarioInviteSuccess, (state): EmpresaState => ({
    ...state, pending: false, error: null,
  })),
  on(regenerateFirstLoginTokenSuccess, (state): EmpresaState => ({
    ...state, pending: false, error: null,
  })),

  // ---- roles success ----
  on(loadRolesSuccess, (state, { roles }): EmpresaState => ({
    ...state,
    roles,
    pending: false,
    error: null,
  })),

  // ---- white label success ----
  on(loadWhiteLabelSuccess, (state, { whiteLabel }): EmpresaState => ({
    ...state, whiteLabel, pending: false, error: null,
  })),
  on(saveWhiteLabelSuccess, (state, { whiteLabel }): EmpresaState => ({
    ...state, whiteLabel, pending: false, error: null,
  })),

  // ---- modulos success ----
  on(loadModulosSuccess, (state, { modulos }): EmpresaState => ({
    ...state, modulos, pending: false, error: null,
  })),
  on(toggleModuloSuccess, (state, { code, enable }): EmpresaState => ({
    ...state,
    modulos: state.modulos.map((m) =>
      m.moduleCode === code ? { ...m, enabled: enable } : m,
    ),
    pending: false,
    error: null,
  })),

  // ---- failures ----
  on(loadUsuariosFailure, (s, { error }) => setFailure(s, error)),
  on(loadUsuarioFailure, (s, { error }) => setFailure(s, error)),
  on(addUsuarioFailure, (s, { error }) => setFailure(s, error)),
  on(updateUsuarioFailure, (s, { error }) => setFailure(s, error)),
  on(toggleUsuarioStatusFailure, (s, { error }) => setFailure(s, error)),
  on(resendUsuarioInviteFailure, (s, { error }) => setFailure(s, error)),
  on(regenerateFirstLoginTokenFailure, (s, { error }) => setFailure(s, error)),
  on(loadRolesFailure, (s, { error }) => setFailure(s, error)),
  on(loadWhiteLabelFailure, (s, { error }) => setFailure(s, error)),
  on(saveWhiteLabelFailure, (s, { error }) => setFailure(s, error)),
  on(loadModulosFailure, (s, { error }) => setFailure(s, error)),
  on(toggleModuloFailure, (s, { error }) => setFailure(s, error)),

  // ---- SMTP pending markers ----
  on(loadSmtpConfig, (state) => ({ ...state, smtpPending: true, error: null })),
  on(saveSmtpConfig, (state) => ({ ...state, smtpPending: true, error: null })),
  on(sendTestEmail, (state) => ({
    ...state, smtpTesting: true, smtpTestResult: null, smtpTestError: null,
  })),

  // ---- SMTP success ----
  on(loadSmtpConfigSuccess, (state, { config }) => ({
    ...state, smtpConfig: config, smtpPending: false,
  })),
  on(saveSmtpConfigSuccess, (state, { config }) => ({
    ...state, smtpConfig: config, smtpPending: false,
  })),
  on(sendTestEmailSuccess, (state, { result }) => ({
    ...state, smtpTesting: false, smtpTestResult: result, smtpTestError: null,
  })),

  // ---- SMTP failures ----
  on(loadSmtpConfigFailure, (state, { error }) => ({
    ...state, smtpPending: false, error,
  })),
  on(saveSmtpConfigFailure, (state, { error }) => ({
    ...state, smtpPending: false, error,
  })),
  on(sendTestEmailFailure, (state, { error }) => ({
    ...state, smtpTesting: false,
    smtpTestError: error?.error?.message || error?.message || 'Error inesperado',
  })),

  // ---- clear test result ----
  on(clearTestEmailResult, (state) => ({
    ...state, smtpTestResult: null, smtpTestError: null,
  })),
);
