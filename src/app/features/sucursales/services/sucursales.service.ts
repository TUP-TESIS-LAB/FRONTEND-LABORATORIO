import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { Sucursal, Area } from '../models/sucursal.model';
import { BranchTotemConfig } from '../models/branch-totem-config.model';

// Subset del PagedBranchResponse / BranchResponse del backend — sólo los
// fields que necesita el selector de agendas. Define localmente para
// evitar arrastrar un tipo grande que el resto de la app no consume.
interface BranchSelectorRow { id: number; code: string; description: string; }
interface PagedBranches { content: BranchSelectorRow[]; }

@Injectable({ providedIn: 'root' })
export class SucursalesService {
  private readonly http = inject(HttpClient);
  getSucursales(): Observable<Sucursal[]> { return this.http.get<Sucursal[]>('/api/sucursales'); }
  // TODO(T2): reemplazar con servicio dedicado de áreas cuando se implemente el HTTP service de sub-recursos (Plan T2)
  getAreas(): Observable<Area[]> { return this.http.get<Area[]>('/api/v1/sucursales/areas'); }

  // Lista plana de branches del tenant para selectores. El backend usa el
  // tenant del JWT, así que no hay que pasar slug ni id desde acá. size=100
  // es alto para que el primer page traiga todo en escenarios reales (un
  // laboratorio típico no tiene más de unas decenas de sedes); si en el
  // futuro alguien tiene más, paginarlo en el componente.
  listBranchesForSelector(): Observable<{ id: number; name: string }[]> {
    return this.http.get<PagedBranches>('/api/v1/sucursales/branches?page=0&size=100').pipe(
      map(p => p.content.map(b => ({ id: b.id, name: `${b.code} — ${b.description}` }))),
    );
  }

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
