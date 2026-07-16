import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { NOT_MODIFIED } from '@core/refresh';
import { mapFlujoMetricsError, safeFetch } from './flujo-metrics-fetch.util';

describe('mapFlujoMetricsError', () => {
  it('propaga el mensaje del backend en un 403 (DomainException ya en español)', () => {
    const err = new HttpErrorResponse({ status: 403, error: { message: 'No tenés acceso a esta sucursal.' } });
    expect(mapFlujoMetricsError(err)).toBe('No tenés acceso a esta sucursal.');
  });

  it('usa un mensaje genérico en 403 sin body', () => {
    const err = new HttpErrorResponse({ status: 403 });
    expect(mapFlujoMetricsError(err)).toBe('No tenés acceso a la sucursal seleccionada.');
  });

  it('mapea 400 a rango de fechas inválido', () => {
    const err = new HttpErrorResponse({ status: 400 });
    expect(mapFlujoMetricsError(err)).toBe('El rango de fechas ingresado no es válido.');
  });

  it('usa un mensaje genérico en cualquier otro status', () => {
    const err = new HttpErrorResponse({ status: 500 });
    expect(mapFlujoMetricsError(err)).toBe('Ocurrió un error al cargar esta métrica. Intentá de nuevo.');
  });

  it('nunca expone el mensaje crudo cuando no es una DomainException', () => {
    const err = new HttpErrorResponse({ status: 500, error: { message: 'lab.laboratorio.NullPointerException' } });
    expect(mapFlujoMetricsError(err)).not.toContain('lab.laboratorio');
  });
});

describe('safeFetch', () => {
  // `of()`/`throwError()` sin scheduler emiten sincrónicamente — no hace falta
  // `done`/async: alcanza con capturar el valor en la misma llamada a subscribe.
  it('mapea un valor exitoso a kind success', () => {
    let result: unknown;
    safeFetch(of({ key: 'k', label: 'L', value: 1, unit: '' })).subscribe((r) => (result = r));
    expect((result as { kind: string }).kind).toBe('success');
  });

  it('mapea el sentinel NOT_MODIFIED a kind notModified', () => {
    let result: unknown;
    safeFetch(of(NOT_MODIFIED)).subscribe((r) => (result = r));
    expect((result as { kind: string }).kind).toBe('notModified');
  });

  it('atrapa un error HTTP y lo mapea a kind error sin propagarlo (no rompe el forkJoin)', () => {
    let result: unknown;
    safeFetch(throwError(() => new HttpErrorResponse({ status: 403 }))).subscribe((r) => (result = r));
    const typed = result as { kind: string; message?: string };
    expect(typed.kind).toBe('error');
    expect(typed.message).toBe('No tenés acceso a la sucursal seleccionada.');
  });
});
