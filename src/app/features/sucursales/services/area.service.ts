import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Area, AreaCreateInput } from '../models/sucursal.model';
import { PageResponse } from './sucursal.service';

@Injectable({ providedIn: 'root' })
export class AreaService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/sucursales/areas';

  list(options: { page?: number; size?: number } = {}): Observable<PageResponse<Area>> {
    const params = new HttpParams()
      .set('page', options.page ?? 0)
      .set('size', options.size ?? 20);
    return this.http.get<PageResponse<Area>>(this.base, { params });
  }

  create(input: AreaCreateInput): Observable<Area> {
    return this.http.post<Area>(this.base, input);
  }

  update(id: number, input: AreaCreateInput): Observable<Area> {
    return this.http.put<Area>(`${this.base}/${id}`, input);
  }

  toggleStatus(id: number): Observable<Area> {
    return this.http.patch<Area>(`${this.base}/${id}/status`, {});
  }
}
