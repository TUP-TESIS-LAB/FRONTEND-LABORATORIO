import { ExternalLab } from '../../models/external-lab.model';
import { derivacionesReducer } from './derivaciones.reducer';
import { DerivacionesState, initialDerivacionesState } from './derivaciones.state';
import {
  enter, setState,
  loadSuccess, loadFailure, mutateSuccess, mutateFailure,
} from './derivaciones.actions';

describe('derivacionesReducer', () => {
  const labs = [{ id: 1, name: 'GenLab' } as ExternalLab];

  it('setea pending y limpia error en Enter', () => {
    const base: DerivacionesState = { ...initialDerivacionesState, error: 'boom' };
    const state = derivacionesReducer(base, enter());
    expect(state.pending).toBe(true);
    expect(state.error).toBeNull();
  });

  it('guarda labs y baja pending en LoadSuccess', () => {
    const state = derivacionesReducer({ ...initialDerivacionesState, pending: true }, loadSuccess({ labs }));
    expect(state.labs.length).toBe(1);
    expect(state.pending).toBe(false);
    expect(state.error).toBeNull();
  });

  it('cambia el segmento y setea pending en SetState', () => {
    const state = derivacionesReducer(initialDerivacionesState, setState({ state: 'inactive' }));
    expect(state.state).toBe('inactive');
    expect(state.pending).toBe(true);
  });

  it('baja pending en MutateSuccess', () => {
    const state = derivacionesReducer({ ...initialDerivacionesState, pending: true }, mutateSuccess());
    expect(state.pending).toBe(false);
  });

  it('setea error y baja pending en LoadFailure', () => {
    const state = derivacionesReducer({ ...initialDerivacionesState, pending: true }, loadFailure({ error: 'boom' }));
    expect(state.error).toBe('boom');
    expect(state.pending).toBe(false);
  });

  it('setea error y baja pending en MutateFailure', () => {
    const state = derivacionesReducer({ ...initialDerivacionesState, pending: true }, mutateFailure({ error: 'boom' }));
    expect(state.error).toBe('boom');
    expect(state.pending).toBe(false);
  });
});
