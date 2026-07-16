import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LabelResponse } from '../models/label.model';

@Injectable({ providedIn: 'root' })
export class LabelsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analitica/preanalitica/labels';

  getByProtocol(protocolId: number): Observable<LabelResponse[]> {
    return this.http.get<LabelResponse[]>(`${this.baseUrl}/protocol/${protocolId}`);
  }
}
