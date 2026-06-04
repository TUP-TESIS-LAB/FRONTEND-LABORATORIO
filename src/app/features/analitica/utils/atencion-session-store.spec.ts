import {
  clearAtencionSession,
  readAtencionSession,
  writeAtencionSession,
} from './atencion-session-store';

describe('atencion-session-store', () => {
  beforeEach(() => sessionStorage.clear());

  it('writes and reads attention id', () => {
    writeAtencionSession({ atencionId: 42, uiStep: 'analisis' });
    expect(readAtencionSession()).toEqual({ atencionId: 42, uiStep: 'analisis' });
  });

  it('returns null when nothing stored', () => {
    expect(readAtencionSession()).toBeNull();
  });

  it('clearAtencionSession removes the entry', () => {
    writeAtencionSession({ atencionId: 1, uiStep: 'datos' });
    clearAtencionSession();
    expect(readAtencionSession()).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    sessionStorage.setItem('atencion:current', '{not-valid}');
    expect(readAtencionSession()).toBeNull();
  });
});
