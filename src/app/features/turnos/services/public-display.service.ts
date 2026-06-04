import { HttpClient, HttpContext, HttpContextToken, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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

  fetchSnapshot(tenantSlug: string, branchId: number): Observable<DisplaySnapshot> {
    return this.http.get<DisplaySnapshot>(
      `/public/display/${tenantSlug}/${branchId}/queue`,
      { context: new HttpContext().set(SKIP_AUTH, true) }
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
