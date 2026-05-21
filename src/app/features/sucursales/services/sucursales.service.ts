import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Sucursal, Area } from '../models/sucursal.model';
import { BranchTotemConfig } from '../models/branch-totem-config.model';

@Injectable({ providedIn: 'root' })
export class SucursalesService {
  private readonly http = inject(HttpClient);
  getSucursales(): Observable<Sucursal[]> { return this.http.get<Sucursal[]>('/api/sucursales'); }
  getAreas(sucursalId: string): Observable<Area[]> { return this.http.get<Area[]>(`/api/sucursales/${sucursalId}/areas`); }

  getTotemConfig(branchId: number): Observable<BranchTotemConfig | null> {
    return this.http.get<BranchTotemConfig>(`/api/v1/sucursales/branches/${branchId}/totem-config`).pipe(
      catchError((err: HttpErrorResponse) => err.status === 404 ? of(null) : throwError(() => err)),
    );
  }

  updateTotemConfig(branchId: number, enabled: boolean): Observable<BranchTotemConfig> {
    return this.http.put<BranchTotemConfig>(
      `/api/v1/sucursales/branches/${branchId}/totem-config`,
      { enabled },
    );
  }
}
