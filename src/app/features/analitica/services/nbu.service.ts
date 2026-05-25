import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { NbuVersion } from '../models/nbu.model';

@Injectable({ providedIn: 'root' })
export class NbuService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analitica/nbu';

  /**
   * Returns the current NBU version for the tenant. Returns null if the endpoint
   * doesn't exist yet (the NBU module isn't deployed in backend), so callers can
   * gracefully hide pricing UI without crashing.
   */
  getCurrent(): Observable<NbuVersion | null> {
    return this.http
      .get<NbuVersion>(`${this.baseUrl}/current`)
      .pipe(catchError(() => of(null)));
  }
}
