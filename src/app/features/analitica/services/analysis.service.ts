import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Analysis, AnalysisDetail } from '../models/atencion.model';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analitica/analysis';

  /** El backend devuelve un array de 0 ó 1 elementos; tomamos el primero o null. */
  findByShortCode(shortCode: string): Observable<Analysis | null> {
    return this.http.get<Analysis[]>(this.baseUrl, {
      params: { shortCode },
    }).pipe(map((list) => list[0] ?? null));
  }

  /** Sugerencias por prefijo numérico del shortCode — usado por el autocomplete del picker. */
  searchByShortCodePrefix(prefix: string, limit = 10): Observable<Analysis[]> {
    return this.http.get<Analysis[]>(this.baseUrl, {
      params: { shortCodePrefix: prefix, limit: String(limit) },
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
