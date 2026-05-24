import { describe, it, expect } from 'vitest';
import { humanizeBackendError } from './error-messages';

const fallback = 'No se pudo guardar el paciente.';

describe('humanizeBackendError', () => {
  it('devuelve fallback cuando el err es null o undefined', () => {
    expect(humanizeBackendError(null, { fallback })).toBe(fallback);
    expect(humanizeBackendError(undefined, { fallback })).toBe(fallback);
  });

  it('prioriza byStatus sobre el body', () => {
    const err = { status: 409, error: { message: 'algo en espanol corto' } };
    const out = humanizeBackendError(err, {
      fallback, byStatus: { 409: 'Ya existe un paciente con ese DNI.' },
    });
    expect(out).toBe('Ya existe un paciente con ese DNI.');
  });

  it('descarta mensajes con FQCN Java (regla #4)', () => {
    const err = {
      status: 400,
      error: { message: 'Invalid value: No enum constant lab.laboratorio.modules.analitica.domain.model.ContactType.MOBILE' },
    };
    expect(humanizeBackendError(err, { fallback })).toBe(fallback);
  });

  it('descarta NullPointerException / ConstraintViolationException', () => {
    expect(humanizeBackendError({ status: 500, error: { message: 'NullPointerException at foo' } }, { fallback })).toBe(fallback);
    expect(humanizeBackendError({ status: 500, error: { message: 'ConstraintViolationException: bad' } }, { fallback })).toBe(fallback);
  });

  it('descarta stack frames de Java', () => {
    const err = { status: 500, error: { message: 'oops\n at lab.foo.Bar.baz(Bar.java:42)' } };
    expect(humanizeBackendError(err, { fallback })).toBe(fallback);
  });

  it('descarta mensajes claramente en ingles', () => {
    expect(humanizeBackendError({ status: 400, error: { message: 'Bad Request' } }, { fallback })).toBe(fallback);
    expect(humanizeBackendError({ status: 404, error: { message: 'Not Found' } }, { fallback })).toBe(fallback);
  });

  it('descarta mensajes excesivamente largos', () => {
    const long = 'a'.repeat(300);
    expect(humanizeBackendError({ status: 500, error: { message: long } }, { fallback })).toBe(fallback);
  });

  it('acepta un mensaje corto en español sin patrones tecnicos', () => {
    const err = { status: 422, error: { message: 'El DNI ingresado no es valido.' } };
    expect(humanizeBackendError(err, { fallback })).toBe('El DNI ingresado no es valido.');
  });

  it('soporta error como string crudo', () => {
    expect(humanizeBackendError({ status: 500, error: 'Datos invalidos.' }, { fallback })).toBe('Datos invalidos.');
  });
});
