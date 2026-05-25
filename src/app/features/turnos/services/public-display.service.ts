import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DisplaySnapshot } from '../models/public-display.model';

// flag para que el auth-token.interceptor NO agregue Authorization header
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

@Injectable({ providedIn: 'root' })
export class PublicDisplayService {
  private http = inject(HttpClient);

  fetchSnapshot(tenantSlug: string, branchId: number): Observable<DisplaySnapshot> {
    return this.http.get<DisplaySnapshot>(
      `/public/display/${tenantSlug}/${branchId}/queue`,
      { context: new HttpContext().set(SKIP_AUTH, true) }
    );
  }
}
