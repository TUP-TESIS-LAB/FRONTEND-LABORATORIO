import { HttpErrorResponse } from '@angular/common/http';

import { SectionListItem } from '../../models/section-list-item.model';
import { seccionesReducer } from './secciones.reducer';
import { SeccionesState, initialSeccionesState } from './secciones.state';
import {
  loadSecciones, loadSeccionesSuccess, loadSeccionesFailure,
  loadCountBySectionSuccess,
  loadUnassignedCountSuccess,
  deleteSeccionSuccess,
} from './secciones.actions';

describe('seccionesReducer', () => {
  const items: SectionListItem[] = [
    { id: 1, name: 'Hematología', active: true, branches: [{ id: 9, code: 'B1', name: 'Central' }] },
    { id: 2, name: 'Química', active: false, branches: [] },
  ];

  it('loadSecciones setea pending y limpia error', () => {
    const state = seccionesReducer({ ...initialSeccionesState, error: new HttpErrorResponse({ status: 500 }) }, loadSecciones());
    expect(state.pending).toBe(true);
    expect(state.error).toBeNull();
  });

  it('loadSeccionesSuccess puebla las secciones y baja pending', () => {
    const state = seccionesReducer({ ...initialSeccionesState, pending: true }, loadSeccionesSuccess({ items }));
    expect(state.secciones).toEqual(items);
    expect(state.pending).toBe(false);
    expect(state.error).toBeNull();
  });

  it('loadCountBySectionSuccess puebla el countMap', () => {
    const state = seccionesReducer(initialSeccionesState, loadCountBySectionSuccess({ countMap: { 1: 4 } }));
    expect(state.countMap).toEqual({ 1: 4 });
  });

  it('loadUnassignedCountSuccess puebla el unassignedCount', () => {
    const state = seccionesReducer(initialSeccionesState, loadUnassignedCountSuccess({ count: 7 }));
    expect(state.unassignedCount).toBe(7);
  });

  it('deleteSeccionSuccess saca la sección de la lista por id', () => {
    const base: SeccionesState = { ...initialSeccionesState, secciones: items };
    const state = seccionesReducer(base, deleteSeccionSuccess({ id: 1 }));
    expect(state.secciones.map((s) => s.id)).toEqual([2]);
  });

  it('loadSeccionesFailure setea error y baja pending', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const state = seccionesReducer({ ...initialSeccionesState, pending: true }, loadSeccionesFailure({ error }));
    expect(state.error).toBe(error);
    expect(state.pending).toBe(false);
  });
});
