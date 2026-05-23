import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { Analysis, AnalysisDetail } from '../models/atencion.model';
import { ANALYSIS_DEMO_CATALOG, ANALYSIS_DEMO_INDEX } from './analysis-demo-catalog';

const DEMO_FLAG = 'analysis:demoMode';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analitica/analysis';

  /**
   * Demo mode: cuando está activo, los lookups devuelven el catálogo hardcoded
   * en lugar de pegarle al backend. Útil para probar el wizard mientras el
   * módulo Analysis no existe en backend. Toggle persistido en localStorage.
   */
  readonly demoMode = signal<boolean>(
    typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_FLAG) === '1',
  );

  setDemoMode(enabled: boolean): void {
    this.demoMode.set(enabled);
    if (typeof localStorage !== 'undefined') {
      if (enabled) localStorage.setItem(DEMO_FLAG, '1');
      else localStorage.removeItem(DEMO_FLAG);
    }
  }

  findByShortCode(shortCode: number): Observable<Analysis | null> {
    if (this.demoMode()) {
      return of(ANALYSIS_DEMO_INDEX.find((a) => a.shortCode === shortCode) ?? null);
    }
    return this.http.get<Analysis | null>(this.baseUrl, {
      params: { shortCode: String(shortCode) },
    });
  }

  /** Sugerencias por prefijo numérico del shortCode — usado por el autocomplete del picker. */
  searchByShortCodePrefix(prefix: string, limit = 10): Observable<Analysis[]> {
    if (this.demoMode()) {
      return of(
        ANALYSIS_DEMO_INDEX.filter((a) => String(a.shortCode).startsWith(prefix)).slice(0, limit),
      );
    }
    return this.http.get<Analysis[]>(this.baseUrl, {
      params: { shortCodePrefix: prefix, limit: String(limit) },
    });
  }

  searchByName(nameLike: string, limit = 10): Observable<Analysis[]> {
    if (this.demoMode()) {
      const q = nameLike.toLowerCase();
      return of(
        ANALYSIS_DEMO_INDEX.filter((a) =>
          a.name.toLowerCase().includes(q) || (a.familyName?.toLowerCase().includes(q) ?? false),
        ).slice(0, limit),
      );
    }
    return this.http.get<Analysis[]>(this.baseUrl, {
      params: { nameLike, limit: String(limit) },
    });
  }

  getById(id: number): Observable<AnalysisDetail> {
    if (this.demoMode()) {
      const hit = ANALYSIS_DEMO_CATALOG.find((a) => a.id === id);
      return hit ? of(hit) : throwError(() => new Error(`No demo analysis ${id}`));
    }
    return this.http.get<AnalysisDetail>(`${this.baseUrl}/${id}`);
  }
}
