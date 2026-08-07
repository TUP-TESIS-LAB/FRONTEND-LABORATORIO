import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { FiscalStatus } from '../models/fiscal-status.model';

@Injectable({ providedIn: 'root' })
export class FiscalStatusApiService {
  private readonly http = inject(HttpClient);

  // El tenant sale del JWT en el backend: no se manda por parámetro.
  get(): Observable<FiscalStatus> {
    return this.http.get<FiscalStatus>('/api/v1/financiero/fiscal-status');
  }
}
