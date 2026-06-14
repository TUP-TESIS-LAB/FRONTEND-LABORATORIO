import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { postanaliticaReducer } from './postanalitica.reducer';
import { initialPostanaliticaState } from './postanalitica.state';
import {
  loadValidation, loadValidationSuccess, loadValidationFailure,
  validateDet, validateDetSuccess, validateDetFailure,
  validateAll, validateAllSuccess, validateAllFailure,
} from './postanalitica.actions';
import { selectValidationView, selectPostanaliticaLoading, selectPostanaliticaSaving, selectPostanaliticaError } from './postanalitica.selectors';
import type { ValidationView } from '../../models/postanalitica.model';

const view: ValidationView = { protocolId: 9, studyStatus: 'PENDING', results: [] };

describe('postanaliticaReducer', () => {
  it('loadValidation → loading=true', () => {
    expect(postanaliticaReducer(initialPostanaliticaState, loadValidation({ protocolId: 9 })).loading).toBe(true);
  });
  it('loadValidationSuccess → view + loading false', () => {
    const s = postanaliticaReducer(initialPostanaliticaState, loadValidationSuccess({ view }));
    expect(s.view).toBe(view); expect(s.loading).toBe(false); expect(s.error).toBeNull();
  });
  it('loadValidationFailure → loading false + error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = postanaliticaReducer({ ...initialPostanaliticaState, loading: true }, loadValidationFailure({ error }));
    expect(s.loading).toBe(false); expect(s.error).toBe(error);
  });
  it('validateDet/validateAll → saving=true; success → false; failure → error', () => {
    expect(postanaliticaReducer(initialPostanaliticaState, validateDet({ resultId: 1, determinationId: 500, outcome: 'PASS' })).saving).toBe(true);
    expect(postanaliticaReducer({ ...initialPostanaliticaState, saving: true }, validateDetSuccess()).saving).toBe(false);
    expect(postanaliticaReducer(initialPostanaliticaState, validateAll({ resultId: 1, outcome: 'PASS' })).saving).toBe(true);
    expect(postanaliticaReducer({ ...initialPostanaliticaState, saving: true }, validateAllSuccess()).saving).toBe(false);
    const error = new HttpErrorResponse({ status: 422 });
    expect(postanaliticaReducer(initialPostanaliticaState, validateDetFailure({ error })).error).toBe(error);
    expect(postanaliticaReducer(initialPostanaliticaState, validateAllFailure({ error })).error).toBe(error);
  });
  it('selectores proyectan', () => {
    const state = { ...initialPostanaliticaState, view, loading: true, saving: true };
    expect(selectValidationView.projector(state)).toBe(view);
    expect(selectPostanaliticaLoading.projector(state)).toBe(true);
    expect(selectPostanaliticaSaving.projector(state)).toBe(true);
    expect(selectPostanaliticaError.projector(state)).toBeNull();
  });
});
