import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sucursal, SucursalCreateInput, SucursalUpdateInput } from '../models/sucursal.model';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class SucursalService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/sucursales/branches';

  list(): Observable<PageResponse<Sucursal>> {
    return this.http.get<PageResponse<Sucursal>>(this.base);
  }

  create(input: SucursalCreateInput): Observable<Sucursal> {
    return this.http.post<Sucursal>(this.base, input);
  }

  update(id: number, input: SucursalUpdateInput): Observable<Sucursal> {
    return this.http.put<Sucursal>(`${this.base}/${id}`, input);
  }

  toggleStatus(id: number): Observable<Sucursal> {
    return this.http.patch<Sucursal>(`${this.base}/${id}/status`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
