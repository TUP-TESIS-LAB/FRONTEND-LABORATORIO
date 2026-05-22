import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Analysis, AnalysisDetail } from '../models/atencion.model';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analitica/analysis';

  findByShortCode(shortCode: number): Observable<Analysis | null> {
    return this.http.get<Analysis | null>(this.baseUrl, {
      params: { shortCode: String(shortCode) },
    });
  }

  searchByName(nameLike: string, limit = 10): Observable<Analysis[]> {
    return this.http.get<Analysis[]>(this.baseUrl, {
      params: { nameLike, limit: String(limit) },
    });
  }

  getById(id: number): Observable<AnalysisDetail> {
    return this.http.get<AnalysisDetail>(`${this.baseUrl}/${id}`);
  }
}
