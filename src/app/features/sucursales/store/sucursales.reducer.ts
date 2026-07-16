import { createReducer, on } from '@ngrx/store';
import { initialSucursalesState, SucursalesState } from './sucursales.state';
import {
  loadSucursales,
  loadSucursalesSuccess,
  loadSucursalesFailure,
  loadAreas,
  loadAreasSuccess,
  loadAreasFailure,
} from './sucursales.actions';

export const sucursalesReducer = createReducer(
  initialSucursalesState,

  on(loadSucursales, (state): SucursalesState => ({
    ...state,
    pending: true,
    error: null,
  })),

  on(loadSucursalesSuccess, (state, { sucursales }): SucursalesState => ({
    ...state,
    sucursales,
    pending: false,
    error: null,
  })),

  on(loadSucursalesFailure, (state, { error }): SucursalesState => ({
    ...state,
    pending: false,
    error,
  })),

  on(loadAreas, (state): SucursalesState => ({
    ...state,
    pending: true,
    error: null,
  })),

  on(loadAreasSuccess, (state, { areas }): SucursalesState => ({
    ...state,
    areas,
    pending: false,
    error: null,
  })),

  on(loadAreasFailure, (state, { error }): SucursalesState => ({
    ...state,
    pending: false,
    error,
  }))
);
