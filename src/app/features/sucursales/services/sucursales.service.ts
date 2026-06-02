import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Sucursal, Area } from '../models/sucursal.model';

// Subset del PagedBranchResponse / BranchResponse del backend — sólo los
// fields que necesita el selector de agendas. Define localmente para
// evitar arrastrar un tipo grande que el resto de la app no consume.
interface BranchSelectorRow { id: number; code: string; description: string; }
interface PagedBranches { content: BranchSelectorRow[]; }

@Injectable({ providedIn: 'root' })
export class SucursalesService {
  private readonly http = inject(HttpClient);
  getSucursales(): Observable<Sucursal[]> { return this.http.get<Sucursal[]>('/api/sucursales'); }
  getAreas(): Observable<Area[]> { return this.http.get<Area[]>('/api/v1/sucursales/areas'); }

  // Lista plana de branches del tenant para selectores. El backend usa el
  // tenant del JWT, así que no hay que pasar slug ni id desde acá. size=100
  // es alto para que el primer page traiga todo en escenarios reales (un
  // laboratorio típico no tiene más de unas decenas de sedes); si en el
  // futuro alguien tiene más, paginarlo en el componente.
  listBranchesForSelector(): Observable<{ id: number; name: string }[]> {
    return this.http.get<PagedBranches>('/api/v1/sucursales/branches?page=0&size=100').pipe(
      map(p => p.content.map(b => ({
        id: b.id,
        // Si description coincide con code (sucursales nuevas, ver datos-step
        // que manda description=code) o esta vacia, no duplicar el texto.
        name: !b.description || b.description === b.code
          ? b.code
          : `${b.code} — ${b.description}`,
      }))),
    );
  }
}
