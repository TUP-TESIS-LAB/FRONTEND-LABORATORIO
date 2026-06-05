import { Injectable } from '@angular/core';

/**
 * Cache en memoria de ETags por request. La clave la construye el interceptor a
 * partir de método + url + query params normalizados, así dos requests con los
 * mismos parámetros en distinto orden comparten ETag.
 */
@Injectable({ providedIn: 'root' })
export class EtagCacheService {
  private readonly store = new Map<string, string>();

  static buildKey(method: string, url: string): string {
    const [path, queryRaw] = url.split('?', 2);
    if (!queryRaw) return `${method.toUpperCase()} ${path}`;
    const params = new URLSearchParams(queryRaw);
    const sorted: string[] = [];
    params.forEach((value, key) => sorted.push(`${key}=${value}`));
    sorted.sort();
    return `${method.toUpperCase()} ${path}?${sorted.join('&')}`;
  }

  get(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, etag: string): void {
    this.store.set(key, etag);
  }

  clear(key?: string): void {
    if (key) this.store.delete(key);
    else this.store.clear();
  }
}
