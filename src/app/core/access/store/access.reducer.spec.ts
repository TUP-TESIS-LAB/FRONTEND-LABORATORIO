import { HttpErrorResponse } from '@angular/common/http';
import { accessReducer } from './access.reducer';
import { initialAccessState } from './access.state';
import {
  loadMySections, loadMySectionsSuccess, loadMySectionsFailure, clearMySections,
} from './access.actions';

describe('accessReducer', () => {
  it('loadMySections marca pending', () => {
    const s = accessReducer(initialAccessState, loadMySections());
    expect(s.pending).toBe(true);
    expect(s.loaded).toBe(false);
  });

  it('loadMySectionsSuccess setea sections y loaded', () => {
    const s = accessReducer(
      { ...initialAccessState, pending: true },
      loadMySectionsSuccess({ sections: ['ATENCION', 'TURNOS'] }),
    );
    expect(s.sections).toEqual(['ATENCION', 'TURNOS']);
    expect(s.loaded).toBe(true);
    expect(s.pending).toBe(false);
  });

  it('loadMySectionsFailure marca loaded igual (para no colgar el guard)', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = accessReducer({ ...initialAccessState, pending: true }, loadMySectionsFailure({ error }));
    expect(s.loaded).toBe(true);
    expect(s.error).toBe(error);
  });

  it('clearMySections resetea al estado inicial', () => {
    const s = accessReducer(
      { sections: ['TURNOS'], loaded: true, pending: false, error: null },
      clearMySections(),
    );
    expect(s).toEqual(initialAccessState);
  });
});
