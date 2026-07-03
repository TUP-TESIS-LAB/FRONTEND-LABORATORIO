import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CoveragePlanOption } from '../models/coverage-plans.catalog';

interface PagedPlanResponse {
  content: PlanResponse[];
}

interface PlanResponse {
  id: number;
  name: string;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class CoveragePlansService {
  private readonly http = inject(HttpClient);

  getActivePlans(): Observable<CoveragePlanOption[]> {
    return this.http
      .get<PagedPlanResponse>('/api/v1/coverages/plans', { params: { state: 'active', size: '100' } })
      .pipe(map((res) => res.content.map((p) => ({ planId: p.id, label: p.name }))));
  }
}
