import { createReducer, on } from '@ngrx/store';
import { initialSucursalState, SucursalState } from './sucursal.state';
import * as A from './sucursal.actions';

export const sucursalReducer = createReducer(
  initialSucursalState,

  // Load
  on(A.loadSucursales, (state): SucursalState => ({ ...state, loading: true, error: null })),
  on(A.loadSucursalesSuccess, (state, { list }): SucursalState => ({ ...state, loading: false, list })),
  on(A.loadSucursalesFailure, (state, { error }): SucursalState => ({ ...state, loading: false, error })),

  // Add
  on(A.addSucursal, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.addSucursalSuccess, (state, { sucursal }): SucursalState => ({
    ...state,
    saving: false,
    list: [...state.list, sucursal],
  })),
  on(A.addSucursalFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // Update
  on(A.updateSucursal, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.updateSucursalSuccess, (state, { sucursal }): SucursalState => ({
    ...state,
    saving: false,
    list: state.list.map(s => s.id === sucursal.id ? sucursal : s),
  })),
  on(A.updateSucursalFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // Toggle status
  on(A.toggleSucursalStatus, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.toggleSucursalStatusSuccess, (state, { sucursal }): SucursalState => ({
    ...state,
    saving: false,
    list: state.list.map(s => s.id === sucursal.id ? sucursal : s),
  })),
  on(A.toggleSucursalStatusFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // Delete
  on(A.deleteSucursal, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.deleteSucursalSuccess, (state, { id }): SucursalState => ({
    ...state,
    saving: false,
    list: state.list.filter(s => s.id !== id),
  })),
  on(A.deleteSucursalFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),
);
