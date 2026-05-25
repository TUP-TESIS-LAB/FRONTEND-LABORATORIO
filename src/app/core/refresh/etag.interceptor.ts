import { HttpErrorResponse, HttpEventType, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, of, tap, throwError } from 'rxjs';
import { EtagCacheService } from './etag-cache.service';
import { NOT_MODIFIED, POLLING_REQUEST } from './polling-context';

/**
 * Interceptor del estándar polling+ETag (CLAUDE.md regla #5). Para requests
 * marcadas con `context.set(POLLING_REQUEST, true)`:
 *
 *  - Si hay un ETag cacheado para la misma URL+query, agrega `If-None-Match`.
 *  - Si la respuesta trae header `ETag`, lo cachea.
 *  - Si la respuesta es 304, Angular la propaga como `HttpErrorResponse` porque
 *    el body está vacío; capturamos ese caso y emitimos el sentinel `NOT_MODIFIED`
 *    como respuesta normal (no como error). El resto de errores se re-tiran.
 *
 * IMPORTANTE: este interceptor debe registrarse ANTES de interceptores que
 * normalicen errores HTTP, para que el 304 nunca llegue a ellos como error.
 */
export const etagInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.context.get(POLLING_REQUEST)) {
    return next(req);
  }

  const cache = inject(EtagCacheService);
  const key = EtagCacheService.buildKey(req.method, req.urlWithParams);
  const cachedEtag = cache.get(key);

  const withConditional = cachedEtag
    ? req.clone({ setHeaders: { 'If-None-Match': cachedEtag } })
    : req;

  return next(withConditional).pipe(
    tap((event) => {
      if (event.type === HttpEventType.Response) {
        const res = event as HttpResponse<unknown>;
        const etag = res.headers.get('ETag');
        if (etag && res.status >= 200 && res.status < 300) {
          cache.set(key, etag);
        }
      }
    }),
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 304) {
        return of(new HttpResponse({
          status: 304,
          statusText: 'Not Modified',
          url: req.urlWithParams,
          body: NOT_MODIFIED,
        }));
      }
      return throwError(() => err);
    }),
  );
};
