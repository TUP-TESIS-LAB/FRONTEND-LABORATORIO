import { HttpErrorResponse } from '@angular/common/http';

import { Manual } from '../models/manual.model';
import * as A from './manual.actions';
import { manualReducer } from './manual.reducer';
import { initialManualState } from './manual.state';

function manual(): Manual {
  return {
    chapters: [
      {
        id: 'core',
        title: 'Base',
        sections: [
          {
            id: 'core-ingresar',
            title: 'Ingresar y moverse',
            topics: [
              {
                id: 'core-como-inicio-sesion',
                title: 'Cómo inicio sesión',
                blocks: [{ type: 'paragraph', text: 'Ingresás con tu correo.', items: [] }],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('manualReducer', () => {
  it('loadManual marca loading y limpia el error previo', () => {
    const start = { ...initialManualState, error: new HttpErrorResponse({ status: 500 }) };
    const next = manualReducer(start, A.loadManual());
    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadManualSuccess guarda el manual y corta el loading', () => {
    const next = manualReducer(
      { ...initialManualState, loading: true },
      A.loadManualSuccess({ manual: manual() }),
    );
    expect(next.manual?.chapters.length).toBe(1);
    expect(next.loading).toBe(false);
    expect(next.error).toBeNull();
  });

  it('loadManualFailure guarda el error y corta el loading', () => {
    const error = new HttpErrorResponse({ status: 503 });
    const next = manualReducer({ ...initialManualState, loading: true }, A.loadManualFailure({ error }));
    expect(next.error).toBe(error);
    expect(next.loading).toBe(false);
  });

  it('un fallo posterior no borra el manual ya cargado', () => {
    const cargado = manualReducer(initialManualState, A.loadManualSuccess({ manual: manual() }));
    const next = manualReducer(cargado, A.loadManualFailure({ error: new HttpErrorResponse({ status: 0 }) }));
    expect(next.manual?.chapters.length).toBe(1);
  });
});
