import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { CoverageCatalog, InsurerOption, InsurerType, PlanOption } from '../models/coverage-catalog.model';
import { insurerDisplayLabel } from '@shared/utils/insurer-display.util';

interface PagedResponse<T> { content: T[]; }
interface InsurerResponse { id: number; name: string; acronym: string; insurerType: InsurerType; active: boolean; }
interface PlanResponse { id: number; insurerId: number; name: string; active: boolean; }

/**
 * Catálogo de coberturas (obras sociales + planes) para la cascada del Paso 2.
 * Lee los activos del módulo de coverages; un solo round-trip combinado.
 */
@Injectable({ providedIn: 'root' })
export class CoverageCatalogService {
  private readonly http = inject(HttpClient);

  getCatalog(): Observable<CoverageCatalog> {
    const insurers$ = this.http
      .get<PagedResponse<InsurerResponse>>('/api/v1/coverages/insurers', { params: { state: 'active', size: '200' } })
      .pipe(map((res): InsurerOption[] =>
        res.content.map((i) => ({
          id: i.id, name: i.name, acronym: i.acronym, insurerType: i.insurerType,
          displayLabel: insurerDisplayLabel(i),
        })),
      ));

    const plans$ = this.http
      .get<PagedResponse<PlanResponse>>('/api/v1/coverages/plans', { params: { state: 'active', size: '200' } })
      .pipe(map((res): PlanOption[] =>
        res.content.map((p) => ({ planId: p.id, insurerId: p.insurerId, name: p.name })),
      ));

    return forkJoin({ insurers: insurers$, plans: plans$ });
  }
}
