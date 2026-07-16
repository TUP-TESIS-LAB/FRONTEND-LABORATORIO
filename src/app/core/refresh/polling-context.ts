import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Marca una request como parte de un polling para que el `etagInterceptor`
 * agregue/lea el header `If-None-Match` automáticamente.
 *
 * No agregues lógica de polling acá — esto es solo un flag.
 */
export const POLLING_REQUEST = new HttpContextToken<boolean>(() => false);

/**
 * Helper para usar desde services HTTP:
 *
 *   this.http.get<T>(url, { context: withPolling() })
 */
export function withPolling(): HttpContext {
  return new HttpContext().set(POLLING_REQUEST, true);
}

/** Sentinel emitido por el interceptor cuando el server respondió 304 Not Modified. */
export interface NotModified {
  readonly notModified: true;
}

export const NOT_MODIFIED: NotModified = Object.freeze({ notModified: true });

export function isNotModified<T>(value: T | NotModified): value is NotModified {
  return typeof value === 'object' && value !== null && (value as NotModified).notModified === true;
}
