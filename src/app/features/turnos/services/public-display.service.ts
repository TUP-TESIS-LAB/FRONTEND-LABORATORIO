import { HttpClient, HttpContext, HttpContextToken, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotModified, withPolling } from '@core/refresh';
import { DisplaySnapshot } from '../models/public-display.model';

// flag para que el auth-token.interceptor NO agregue Authorization header
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/** Subset de BranchPublicResponse del back — solo lo que usa la TV. */
export interface PublicBranch {
  id: number;
  code: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class PublicDisplayService {
  private http = inject(HttpClient);

  fetchSnapshot(tenantSlug: string, branchId: number): Observable<DisplaySnapshot | NotModified> {
    const context = withPolling().set(SKIP_AUTH, true);
    return this.http.get<DisplaySnapshot | NotModified>(
      `/public/display/${tenantSlug}/${branchId}/queue`,
      { context }
    );
  }

  /**
   * Lista las sucursales publicas de un tenant. Endpoint sin auth
   * (permitAll en SecurityConfig). Usado por la TV para recuperarse
   * cuando el snapshot da 404 — el operador elige otra sucursal sin
   * tener que tocar la URL.
   */
  listPublicBranches(tenantSlug: string): Observable<PublicBranch[]> {
    return this.http.get<PublicBranch[]>(
      '/api/v1/sucursales/public',
      {
        params: new HttpParams().set('slug', tenantSlug),
        context: new HttpContext().set(SKIP_AUTH, true),
      },
    );
  }
}
