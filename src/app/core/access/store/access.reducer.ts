import { createReducer, on } from '@ngrx/store';
import { AccessState, initialAccessState } from './access.state';
import {
  loadMySections, loadMySectionsSuccess, loadMySectionsFailure, clearMySections,
} from './access.actions';

export const accessReducer = createReducer(
  initialAccessState,
  on(loadMySections, (state): AccessState => ({ ...state, pending: true, error: null })),
  on(loadMySectionsSuccess, (state, { sections }): AccessState => ({
    ...state, sections, loaded: true, pending: false, error: null,
  })),
  on(loadMySectionsFailure, (state, { error }): AccessState => ({
    ...state, loaded: true, pending: false, error,
  })),
  on(clearMySections, (): AccessState => ({ ...initialAccessState })),
);
