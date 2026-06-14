import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { resultadosReducer } from './resultados.reducer';
import { initialResultadosState } from './resultados.state';
import {
  loadGrid, loadGridSuccess, loadGridFailure,
  saveResults, saveResultsSuccess, saveResultsFailure,
  markReady, markReadySuccess, markReadyFailure,
} from './resultados.actions';
import { selectGrid, selectResultadosLoading, selectResultadosSaving, selectResultadosError } from './resultados.selectors';
import type { ResultGrid } from '../../models/resultado.model';

const grid: ResultGrid = { protocolId: 9, sections: [] };

describe('resultadosReducer', () => {
  it('loadGrid → loading=true', () => {
    expect(resultadosReducer(initialResultadosState, loadGrid({ protocolId: 9 })).loading).toBe(true);
  });
  it('loadGridSuccess → grid + loading false', () => {
    const s = resultadosReducer(initialResultadosState, loadGridSuccess({ grid }));
    expect(s.grid).toBe(grid); expect(s.loading).toBe(false); expect(s.error).toBeNull();
  });
  it('loadGridFailure → loading false + error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = resultadosReducer({ ...initialResultadosState, loading: true }, loadGridFailure({ error }));
    expect(s.loading).toBe(false); expect(s.error).toBe(error);
  });
  it('saveResults → saving=true', () => {
    expect(resultadosReducer(initialResultadosState, saveResults({ results: [] })).saving).toBe(true);
  });
  it('saveResultsSuccess → saving=false', () => {
    expect(resultadosReducer({ ...initialResultadosState, saving: true }, saveResultsSuccess()).saving).toBe(false);
  });
  it('saveResultsFailure → saving=false + error', () => {
    const error = new HttpErrorResponse({ status: 422 });
    const s = resultadosReducer({ ...initialResultadosState, saving: true }, saveResultsFailure({ error }));
    expect(s.saving).toBe(false); expect(s.error).toBe(error);
  });
  it('markReady → saving=true; markReadySuccess → false; markReadyFailure → error', () => {
    expect(resultadosReducer(initialResultadosState, markReady({ resultIds: [1] })).saving).toBe(true);
    expect(resultadosReducer({ ...initialResultadosState, saving: true }, markReadySuccess()).saving).toBe(false);
    const error = new HttpErrorResponse({ status: 422 });
    expect(resultadosReducer(initialResultadosState, markReadyFailure({ error })).error).toBe(error);
  });
  it('selectores proyectan', () => {
    const state = { ...initialResultadosState, grid, loading: true, saving: true };
    expect(selectGrid.projector(state)).toBe(grid);
    expect(selectResultadosLoading.projector(state)).toBe(true);
    expect(selectResultadosSaving.projector(state)).toBe(true);
    expect(selectResultadosError.projector(state)).toBeNull();
  });
});
