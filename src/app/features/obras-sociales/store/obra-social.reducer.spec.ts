import { HttpErrorResponse } from '@angular/common/http';
import { obraSocialReducer } from './obra-social.reducer';
import { initialObraSocialState } from './obra-social.state';
import {
  loadObrasSociales, loadObrasSocialesSuccess, loadObrasSocialesFailure,
  setObraSocialPageRequest,
  loadObraSocial, loadObraSocialSuccess, clearSelectedObraSocial,
  createObraSocial, createObraSocialSuccess, createObraSocialFailure,
  loadObraSocialCatalogsSuccess,
} from './obra-social.actions';
import { InsurerComplete, InsurerSummary } from '../models/insurer.model';

const summary = (id: number, active = true): InsurerSummary => ({
  id, code: `C${id}`, acronym: `A${id}`, name: `OS ${id}`,
  insurerType: 'SOCIAL', insurerTypeName: 'Obra Social', active,
});
const complete = (id: number): InsurerComplete => ({
  id, code: `C${id}`, name: `OS ${id}`, acronym: `A${id}`,
  insurerType: 'SOCIAL', insurerTypeName: 'Obra Social', active: true,
  plans: [], contacts: [],
});

describe('obraSocialReducer', () => {
  it('loadObrasSociales pone pending=true y limpia error', () => {
    const before = { ...initialObraSocialState, error: { status: 500 } as HttpErrorResponse };
    const next = obraSocialReducer(before, loadObrasSociales({ req: initialObraSocialState.pageRequest }));
    expect(next.pending).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadObrasSocialesSuccess reemplaza items y totales', () => {
    const result = { content: [summary(1)], totalElements: 1, totalPages: 1, page: 0, size: 20 };
    const next = obraSocialReducer({ ...initialObraSocialState, pending: true }, loadObrasSocialesSuccess({ result }));
    expect(next.items.length).toBe(1);
    expect(next.totalElements).toBe(1);
    expect(next.pending).toBe(false);
  });

  it('loadObrasSocialesFailure guarda error y limpia pending', () => {
    const err = { status: 500 } as HttpErrorResponse;
    const next = obraSocialReducer({ ...initialObraSocialState, pending: true }, loadObrasSocialesFailure({ error: err }));
    expect(next.pending).toBe(false);
    expect(next.error).toBe(err);
  });

  it('setObraSocialPageRequest mergea el patch', () => {
    const next = obraSocialReducer(initialObraSocialState, setObraSocialPageRequest({ patch: { q: 'os', page: 2 } }));
    expect(next.pageRequest).toEqual({ ...initialObraSocialState.pageRequest, q: 'os', page: 2 });
  });

  it('loadObraSocialSuccess guarda selected y limpia pending', () => {
    const next = obraSocialReducer({ ...initialObraSocialState, pending: true }, loadObraSocialSuccess({ insurer: complete(7) }));
    expect(next.selected?.id).toBe(7);
    expect(next.pending).toBe(false);
  });

  it('clearSelectedObraSocial pone selected=null', () => {
    const next = obraSocialReducer({ ...initialObraSocialState, selected: complete(1) }, clearSelectedObraSocial());
    expect(next.selected).toBeNull();
  });

  it('createObraSocial pone creating=true; success lo limpia', () => {
    const dummyPayload = { insurer: { code: '', name: '', acronym: '', insurerType: 'SOCIAL' as const, specificData: null }, plans: [], contacts: [] };
    const after = obraSocialReducer(initialObraSocialState, createObraSocial({ payload: dummyPayload }));
    expect(after.creating).toBe(true);
    const done = obraSocialReducer(after, createObraSocialSuccess({ insurer: complete(1) }));
    expect(done.creating).toBe(false);
  });

  it('createObraSocialFailure guarda error y limpia creating', () => {
    const err = { status: 409 } as HttpErrorResponse;
    const next = obraSocialReducer({ ...initialObraSocialState, creating: true }, createObraSocialFailure({ error: err }));
    expect(next.creating).toBe(false);
    expect(next.error).toBe(err);
  });

  it('loadObraSocialCatalogsSuccess guarda los 3 catálogos', () => {
    const next = obraSocialReducer(initialObraSocialState, loadObraSocialCatalogsSuccess({
      insurerTypes: [{ name: 'SOCIAL', description: 'Obra Social' }],
      nbuVersions: [{ id: 1, versionCode: '2021_2024', publicationYear: 2021, effectivityDate: '2021-01-01' }],
      contactTypes: [{ name: 'PHONE', description: 'Teléfono' }],
    }));
    expect(next.insurerTypes.length).toBe(1);
    expect(next.nbuVersions.length).toBe(1);
    expect(next.contactTypes.length).toBe(1);
  });
});
