import { createReducer, on } from '@ngrx/store';
import { EmpresaState, initialEmpresaState } from './empresa.state';
import {
  loadUsuarios,
  loadUsuariosSuccess,
  loadUsuariosFailure,
  loadRoles,
  loadRolesSuccess,
  loadRolesFailure,
} from './empresa.actions';

export const empresaReducer = createReducer(
  initialEmpresaState,

  on(loadUsuarios, (state): EmpresaState => ({
    ...state,
    pending: true,
    error: null,
  })),

  on(loadUsuariosSuccess, (state, { usuarios }): EmpresaState => ({
    ...state,
    usuarios,
    pending: false,
    error: null,
  })),

  on(loadUsuariosFailure, (state, { error }): EmpresaState => ({
    ...state,
    pending: false,
    error,
  })),

  on(loadRoles, (state): EmpresaState => ({
    ...state,
    pending: true,
    error: null,
  })),

  on(loadRolesSuccess, (state, { roles }): EmpresaState => ({
    ...state,
    roles,
    pending: false,
    error: null,
  })),

  on(loadRolesFailure, (state, { error }): EmpresaState => ({
    ...state,
    pending: false,
    error,
  })),
);
