import { createReducer, on } from '@ngrx/store';
import { ObraSocialState, initialObraSocialState } from './obra-social.state';
import {
  loadObrasSociales, loadObrasSocialesSuccess, loadObrasSocialesFailure,
  setObraSocialPageRequest,
  loadObraSocial, loadObraSocialSuccess, loadObraSocialFailure, clearSelectedObraSocial,
  createObraSocial, createObraSocialSuccess, createObraSocialFailure,
  loadObraSocialCatalogsSuccess,
} from './obra-social.actions';

export const obraSocialReducer = createReducer(
  initialObraSocialState,

  // Intent: pending / creating
  on(loadObrasSociales, (state): ObraSocialState => ({ ...state, pending: true, error: null })),
  on(loadObraSocial, (state): ObraSocialState => ({ ...state, pending: true, error: null })),
  on(createObraSocial, (state): ObraSocialState => ({ ...state, creating: true, error: null })),

  // Success
  on(loadObrasSocialesSuccess, (state, { result }): ObraSocialState => ({
    ...state,
    items: result.content,
    totalElements: result.totalElements,
    totalPages: result.totalPages,
    pending: false,
    error: null,
  })),
  on(loadObraSocialSuccess, (state, { insurer }): ObraSocialState => ({
    ...state, selected: insurer, pending: false, error: null,
  })),
  on(createObraSocialSuccess, (state): ObraSocialState => ({
    ...state, creating: false, error: null,
  })),
  on(loadObraSocialCatalogsSuccess, (state, { insurerTypes, nbuVersions, contactTypes }): ObraSocialState => ({
    ...state, insurerTypes, nbuVersions, contactTypes,
  })),

  // Failure
  on(loadObrasSocialesFailure, (state, { error }): ObraSocialState => ({ ...state, pending: false, error })),
  on(loadObraSocialFailure, (state, { error }): ObraSocialState => ({ ...state, pending: false, error })),
  on(createObraSocialFailure, (state, { error }): ObraSocialState => ({ ...state, creating: false, error })),

  // UI misc
  on(setObraSocialPageRequest, (state, { patch }): ObraSocialState => ({
    ...state, pageRequest: { ...state.pageRequest, ...patch },
  })),
  on(clearSelectedObraSocial, (state): ObraSocialState => ({ ...state, selected: null })),
);
