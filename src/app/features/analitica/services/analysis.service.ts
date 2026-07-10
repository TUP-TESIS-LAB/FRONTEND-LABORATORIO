import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Analysis, AnalysisDetail } from '../models/atencion.model';
import { ResolvedAnalysis, SectionAnalysis } from '../models/section-analysis.model';

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

  /**
   * Búsqueda unificada (KAN-246): matchea nombre, código interno (short_code) y código
   * NBU, con match tipo "contiene" (no solo prefijo) — encuentra por ej. por los últimos
   * dígitos de un código. Usada por el autocomplete del picker de análisis en la atención.
   */
  search(q: string, limit = 10): Observable<Analysis[]> {
    return this.http.get<Analysis[]>(this.baseUrl, {
      params: { q, limit: String(limit) },
    });
  }

  getById(id: number): Observable<AnalysisDetail> {
    return this.http.get<AnalysisDetail>(`${this.baseUrl}/${id}`);
  }

  /**
   * Lista el catálogo de análisis activado del tenant (REAL). Usa el endpoint de búsqueda
   * con `shortCodePrefix` vacío, que devuelve todas las filas activadas con su `cantidadUb`
   * (pasar solo `limit` no lista nada: el endpoint es de búsqueda y necesita un criterio).
   * Nota: GET /api/v1/analitica/catalog lista el catálogo global pero NO trae cantidadUb,
   * por eso para el Nomenclador usamos /analysis (tenant-scoped, con cantidadUb).
   */
  list(limit = 200): Observable<Analysis[]> {
    return this.http.get<Analysis[]>(this.baseUrl, { params: { shortCodePrefix: '', limit: String(limit) } });
  }

  // ── Secciones (KAN-218) — rutas absolutas distintas de baseUrl ──────────────

  /** Conteo de análisis por sección (sectionId → cantidad) para el tenant actual. */
  countBySection(): Observable<Record<number, number>> {
    return this.http.get<Record<number, number>>('/api/v1/analitica/analyses/count-by-section');
  }

  /** Cantidad de análisis del tenant sin sección asignada. */
  unassignedCount(): Observable<number> {
    return this.http.get<number>('/api/v1/analitica/analyses/unassigned-count');
  }

  /** Análisis asignados a una sección (con nombre resuelto), para poblar el editor de chips. */
  sectionAnalyses(sectionId: number): Observable<SectionAnalysis[]> {
    return this.http.get<SectionAnalysis[]>(`/api/v1/analitica/section-assignments/${sectionId}`);
  }

  /** Set atómico de los análisis de una sección (PUT tenant-safe → 204). */
  setSectionAnalyses(sectionId: number, analysisIds: number[]): Observable<void> {
    return this.http.put<void>(`/api/v1/analitica/section-assignments/${sectionId}`, { analysisIds });
  }

  /** Resuelve nombres pegados (batch) contra el catálogo del tenant. */
  resolveByNames(names: string[]): Observable<ResolvedAnalysis[]> {
    return this.http.post<ResolvedAnalysis[]>('/api/v1/analitica/analysis/resolve', { names });
  }
}
