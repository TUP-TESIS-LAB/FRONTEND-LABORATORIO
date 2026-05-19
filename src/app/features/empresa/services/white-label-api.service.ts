import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GuardarWhiteLabelPayload, WhiteLabel } from '../models/white-label.model';

@Injectable({ providedIn: 'root' })
export class WhiteLabelApiService {
  private readonly http = inject(HttpClient);

  get(): Observable<WhiteLabel> {
    return this.http.get<WhiteLabel>('/api/v1/empresa/white-label');
  }

  save(payload: GuardarWhiteLabelPayload): Observable<WhiteLabel> {
    return this.http.put<WhiteLabel>('/api/v1/empresa/white-label', payload);
  }
}
