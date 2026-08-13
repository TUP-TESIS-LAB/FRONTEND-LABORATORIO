import { NbuVersion, resolveDefaultVersionId } from './nomenclador.model';

function version(over: Partial<NbuVersion> = {}): NbuVersion {
  return { id: '1', label: 'NBU 2024', vigente: false, ...over };
}

describe('resolveDefaultVersionId', () => {

  it('elige la versión vigente aunque sea la última de la lista', () => {
    // Payload real de GET /api/v1/analitica/nbu-versions: la más vieja viene primero.
    const versions = [
      version({ id: '1', label: 'NBU NBU-2012-16' }),
      version({ id: '2', label: 'NBU NBU-ANEXO-2023' }),
      version({ id: '3', label: 'NBU NBU-ANEXO-2024', vigente: true }),
    ];
    expect(resolveDefaultVersionId(versions)).toBe('3');
  });

  it('elige la vigente aunque sea la primera', () => {
    const versions = [
      version({ id: '9', vigente: true }),
      version({ id: '10' }),
    ];
    expect(resolveDefaultVersionId(versions)).toBe('9');
  });

  it('sin ninguna vigente cae a la de mayor id, nunca a la primera (la más vieja)', () => {
    const versions = [
      version({ id: '1', label: 'NBU NBU-2012-16' }),
      version({ id: '2', label: 'NBU NBU-ANEXO-2023' }),
      version({ id: '3', label: 'NBU NBU-ANEXO-2024' }),
    ];
    expect(resolveDefaultVersionId(versions)).toBe('3');
  });

  it('el fallback por mayor id no depende del orden del array', () => {
    const versions = [
      version({ id: '3' }),
      version({ id: '1' }),
      version({ id: '2' }),
    ];
    expect(resolveDefaultVersionId(versions)).toBe('3');
  });

  it('compara los ids como números, no como strings', () => {
    // Con comparación lexicográfica '9' > '10' y elegiría la versión equivocada.
    const versions = [version({ id: '9' }), version({ id: '10' })];
    expect(resolveDefaultVersionId(versions)).toBe('10');
  });

  it('devuelve null con la lista vacía (el selector muestra el placeholder)', () => {
    expect(resolveDefaultVersionId([])).toBeNull();
  });

  it('con una sola versión inactiva la devuelve igual', () => {
    expect(resolveDefaultVersionId([version({ id: '7' })])).toBe('7');
  });
});
