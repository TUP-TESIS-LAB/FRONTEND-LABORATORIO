import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Province { id: number; name: string; }
export interface City { id: number; name: string; provinceId: number; }

@Injectable({ providedIn: 'root' })
export class GeographyService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/sucursales/geography';

  listProvinces(): Observable<Province[]> {
    return this.http.get<Province[]>(`${this.base}/provinces`);
  }

  listCitiesByProvince(provinceId: number): Observable<City[]> {
    return this.http.get<City[]>(`${this.base}/provinces/${provinceId}/cities`);
  }
}
