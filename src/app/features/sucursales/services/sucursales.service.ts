import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sucursal, Area } from '../models/sucursal.model';

@Injectable()
export class SucursalesService {
  private readonly http = inject(HttpClient);
  getSucursales(): Observable<Sucursal[]> { return this.http.get<Sucursal[]>('/api/sucursales'); }
  getAreas(sucursalId: string): Observable<Area[]> { return this.http.get<Area[]>(`/api/sucursales/${sucursalId}/areas`); }
}
