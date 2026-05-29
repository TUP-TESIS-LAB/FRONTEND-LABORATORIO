import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Section, SectionCreateInput } from '../models/section.model';
import { PageResponse } from '../models/page-response.model';

@Injectable({ providedIn: 'root' })
export class SectionService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/sucursales/sections';

  list(options: { areaId?: number; page?: number; size?: number } = {}): Observable<PageResponse<Section>> {
    let params = new HttpParams()
      .set('page', options.page ?? 0)
      .set('size', options.size ?? 20);
    if (options.areaId != null) {
      params = params.set('areaId', options.areaId);
    }
    return this.http.get<PageResponse<Section>>(this.base, { params });
  }

  create(input: SectionCreateInput): Observable<Section> {
    return this.http.post<Section>(this.base, input);
  }

  update(id: number, input: SectionCreateInput): Observable<Section> {
    return this.http.put<Section>(`${this.base}/${id}`, input);
  }

  toggleStatus(id: number): Observable<Section> {
    return this.http.patch<Section>(`${this.base}/${id}/status`, {});
  }
}
