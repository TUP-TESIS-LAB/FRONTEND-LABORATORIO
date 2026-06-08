import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { withPolling, NotModified } from '@core/refresh';
import { SKIP_AUTH } from './public-display.service';
import { ExtractionDisplaySnapshot } from '../models/extraction-display.model';

@Injectable({ providedIn: 'root' })
export class ExtractionDisplayService {
  private readonly http = inject(HttpClient);

  fetchSnapshot(
    tenantSlug: string,
    branchId: number
  ): Observable<ExtractionDisplaySnapshot | NotModified> {
    const context = withPolling().set(SKIP_AUTH, true);
    return this.http.get<ExtractionDisplaySnapshot | NotModified>(
      `/public/display/extraccion/${tenantSlug}/${branchId}`,
      { context }
    );
  }
}
