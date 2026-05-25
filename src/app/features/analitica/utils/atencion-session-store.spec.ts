import {
  clearAtencionSession,
  readAtencionSession,
  writeAtencionSession,
  writePendingDni,
  readPendingDni,
  clearPendingDni,
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

  it('pending DNI is stored separately and survives clearAtencionSession', () => {
    writePendingDni('32456789');
    writeAtencionSession({ atencionId: 5, uiStep: 'datos' });
    clearAtencionSession();
    expect(readPendingDni()).toBe('32456789');
  });

  it('clearPendingDni removes only the DNI entry', () => {
    writeAtencionSession({ atencionId: 1, uiStep: 'datos' });
    writePendingDni('111');
    clearPendingDni();
    expect(readAtencionSession()).not.toBeNull();
    expect(readPendingDni()).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    sessionStorage.setItem('atencion:current', '{not-valid}');
    expect(readAtencionSession()).toBeNull();
  });
});
