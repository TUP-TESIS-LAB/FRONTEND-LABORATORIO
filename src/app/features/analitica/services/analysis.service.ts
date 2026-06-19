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

  /**
   * Lista el catálogo de análisis activado del tenant. HOY usa el endpoint de búsqueda
   * con `shortCodePrefix` vacío, que devuelve todas las filas activadas (pasar solo `limit`
   * no lista nada: el endpoint es de búsqueda y necesita un criterio).
   * MOCK-CONNECT — PR #97: reemplazar por GET /api/v1/analitica/catalog (paginado real).
   */
  list(limit = 200): Observable<Analysis[]> {
    return this.http.get<Analysis[]>(this.baseUrl, { params: { shortCodePrefix: '', limit: String(limit) } });
  }
}
