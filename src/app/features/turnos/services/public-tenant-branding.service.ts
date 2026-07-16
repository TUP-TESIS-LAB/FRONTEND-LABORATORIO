import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SKIP_AUTH } from './public-display.service';

export interface PublicTenantWhiteLabel {
  tenantSlug: string;
  systemName: string;
  primaryColor: string;
  secondaryColor: string;
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class PublicTenantBrandingService {
  private http = inject(HttpClient);

  getWhiteLabel(slug: string): Observable<PublicTenantWhiteLabel> {
    return this.http.get<PublicTenantWhiteLabel>(
      `/public/tenants/${slug}/white-label`,
      { context: new HttpContext().set(SKIP_AUTH, true) },
    );
  }
}
