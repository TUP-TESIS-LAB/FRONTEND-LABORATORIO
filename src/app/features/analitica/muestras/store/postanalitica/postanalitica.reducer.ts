import { createReducer, on } from '@ngrx/store';
import { initialPostanaliticaState, PostanaliticaState } from './postanalitica.state';
import {
  loadValidation, loadValidationSuccess, loadValidationFailure,
  validateDet, validateDetSuccess, validateDetFailure,
  validateAll, validateAllSuccess, validateAllFailure,
} from './postanalitica.actions';

export const postanaliticaReducer = createReducer(
  initialPostanaliticaState,
  on(loadValidation, (s): PostanaliticaState => ({ ...s, loading: true, error: null })),
  on(loadValidationSuccess, (s, { view }): PostanaliticaState => ({ ...s, view, loading: false, error: null })),
  on(loadValidationFailure, (s, { error }): PostanaliticaState => ({ ...s, loading: false, error })),
  on(validateDet, (s): PostanaliticaState => ({ ...s, saving: true, error: null })),
  on(validateDetSuccess, (s): PostanaliticaState => ({ ...s, saving: false })),
  on(validateDetFailure, (s, { error }): PostanaliticaState => ({ ...s, saving: false, error })),
  on(validateAll, (s): PostanaliticaState => ({ ...s, saving: true, error: null })),
  on(validateAllSuccess, (s): PostanaliticaState => ({ ...s, saving: false })),
  on(validateAllFailure, (s, { error }): PostanaliticaState => ({ ...s, saving: false, error })),
);
