import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { NotModified, isNotModified } from '@core/refresh';

/**
 * Resultado de un fetch individual dentro de un `forkJoin` de varias métricas.
 * Nunca propaga error al `forkJoin` — una sucursal sin acceso (403) en UNA
 * métrica no debe tirar abajo las otras 6-9 que sí resolvieron.
 */
export type FetchResult<T> =
  | { kind: 'success'; data: T }
  | { kind: 'notModified' }
  | { kind: 'error'; message: string };

/** Mensaje en español, sin leak (regla #4). `DomainException` (403 de sucursal) ya viene en español. */
export function mapFlujoMetricsError(e: HttpErrorResponse): string {
  const apiMsg = typeof e.error?.message === 'string' ? e.error.message : '';
  if (e.status === 403 && apiMsg) return apiMsg;
  if (e.status === 403) return 'No tenés acceso a la sucursal seleccionada.';
  if (e.status === 400) return 'El rango de fechas ingresado no es válido.';
  return 'Ocurrió un error al cargar esta métrica. Intentá de nuevo.';
}

/** Envuelve un fetch de métrica (`T | NotModified`) en un `FetchResult<T>` que nunca emite error. */
export function safeFetch<T>(source$: Observable<T | NotModified>): Observable<FetchResult<T>> {
  return source$.pipe(
    map((res): FetchResult<T> => (isNotModified(res) ? { kind: 'notModified' } : { kind: 'success', data: res })),
    catchError((e: HttpErrorResponse) => of<FetchResult<T>>({ kind: 'error', message: mapFlujoMetricsError(e) })),
  );
}
