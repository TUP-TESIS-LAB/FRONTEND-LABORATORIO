import { createBreakdownTranslator, translateMetricLabel } from './metric-label.util';

describe('translateMetricLabel', () => {
  const KNOWN_TRANSLATIONS: Record<string, string> = {
    READY_TO_SAMPLE_COLLECTION: 'Listo para toma de muestra',
    SAMPLE_PREPARED: 'Muestra preparada',
    SAMPLE_CHECKED_IN: 'Muestra recibida',
    MANUAL_MEASUREMENT_IN_PROGRESS: 'Medición manual en curso',
    AUTOMATED_MEASUREMENT_IN_PROGRESS: 'Medición automática en curso',
    LOADED_RESULTS: 'Resultados cargados',
    MEASUREMENT_MANUAL_REVIEW: 'Revisión manual',
    MEASUREMENT_AUTOMATED_REVIEW: 'Revisión automática',
    MEASUREMENT_TECHNICAL_REVIEW: 'Revisión técnica',
    RESULTS_VALIDATED: 'Resultados validados',
    RESULTS_DELIVERED: 'Resultados entregados',
    CANCELED: 'Cancelado',
    PENDING: 'Pendiente',
    PARTIALLY_SIGNED: 'Firmado parcialmente',
    READY_FOR_SIGNATURE: 'Listo para firmar',
    CLOSED: 'Cerrado',
    MALE: 'Masculino',
    FEMALE: 'Femenino',
    OTHER: 'Otro',
    NOT_SPECIFIED: 'No especificado',
  };

  it.each(Object.entries(KNOWN_TRANSLATIONS))('traduce %s a español', (raw, expected) => {
    expect(translateMetricLabel(raw)).toBe(expected);
  });

  it('humaniza un valor desconocido en vez de mostrarlo crudo', () => {
    expect(translateMetricLabel('SOME_NEW_STATUS')).toBe('Some new status');
  });

  it('humaniza un valor de una sola palabra', () => {
    expect(translateMetricLabel('ARCHIVED')).toBe('Archived');
  });

  it('devuelve string vacío tal cual', () => {
    expect(translateMetricLabel('')).toBe('');
  });
});

describe('createBreakdownTranslator', () => {
  const breakdown = { dimension: 'genero', slices: [{ key: 'MALE', label: 'MALE', value: 3 }] };

  it('traduce las labels de las slices', () => {
    const translate = createBreakdownTranslator();
    expect(translate(breakdown)?.slices[0].label).toBe('Masculino');
  });

  it('devuelve la MISMA referencia de salida si la entrada no cambió (evita re-render espurio)', () => {
    const translate = createBreakdownTranslator();
    const first = translate(breakdown);
    const second = translate(breakdown);
    expect(second).toBe(first);
  });

  it('devuelve una referencia NUEVA cuando la entrada cambió', () => {
    const translate = createBreakdownTranslator();
    const first = translate(breakdown);
    const other = { dimension: 'genero', slices: [{ key: 'FEMALE', label: 'FEMALE', value: 1 }] };
    const second = translate(other);
    expect(second).not.toBe(first);
    expect(second?.slices[0].label).toBe('Femenino');
  });

  it('undefined/null entra y sale sin romper, y sigue memoizado', () => {
    const translate = createBreakdownTranslator();
    expect(translate(undefined)).toBeUndefined();
    expect(translate(null)).toBeUndefined();
  });
});
