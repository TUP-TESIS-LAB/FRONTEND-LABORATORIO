import { inject, Injectable, signal } from '@angular/core';
import { forkJoin, of, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ResultadosApiService } from './resultados-api.service';

/** Progreso de carga de un protocolo: determinaciones cargadas / esperadas. */
export interface ProtocoloProgreso {
  protocolId: number;
  /** resultIds del protocolo (los AnalyticalResult), para mark-ready. */
  resultIds: number[];
  filled: number;
  total: number;
  status: 'completa' | 'parcial' | 'sin';
}

/**
 * Cache de progreso por protocolo (GAP-P2). Evita repetir las llamadas a
 * resultados+determinaciones: si el progreso de un protocolo ya está en cache se
 * reusa; solo se consulta el backend si no está, o si se invalidó tras cargar/
 * actualizar valores. El builder del grid y "Marcar completadas" comparten esta cache.
 */
@Injectable({ providedIn: 'root' })
export class ProcesamientoProgresoService {
  private readonly resultados = inject(ResultadosApiService);
  private readonly cache = signal<ReadonlyMap<number, ProtocoloProgreso>>(new Map());

  /** Invalida el progreso de un protocolo (al guardar/actualizar sus resultados). */
  invalidate(protocolId: number): void {
    this.cache.update(m => { const n = new Map(m); n.delete(protocolId); return n; });
  }

  /** Progreso de varios protocolos: reusa cache, consulta solo los que faltan. */
  getMany(protocolIds: number[]): Observable<ProtocoloProgreso[]> {
    const cached = this.cache();
    const missing = protocolIds.filter(id => !cached.has(id));
    const fetch$ = missing.length
      ? forkJoin(missing.map(id => this.computeProgreso(id)))
      : of([] as ProtocoloProgreso[]);
    return fetch$.pipe(
      map(fresh => {
        if (fresh.length) {
          this.cache.update(m => { const n = new Map(m); for (const p of fresh) n.set(p.protocolId, p); return n; });
        }
        const all = this.cache();
        return protocolIds.map(id => all.get(id)!).filter(Boolean);
      }),
    );
  }

  /** Consulta y arma el progreso de un protocolo desde el backend. */
  private computeProgreso(protocolId: number): Observable<ProtocoloProgreso> {
    return this.resultados.getResultsByProtocol(protocolId).pipe(
      switchMap(results => {
        if (results.length === 0) {
          return of({ protocolId, resultIds: [], filled: 0, total: 0, status: 'sin' as const });
        }
        return forkJoin(results.map(r => this.resultados.getDeterminations(r.id))).pipe(
          map(detLists => {
            const dets = detLists.flat();
            const total = dets.length;
            const filled = dets.filter(d => (d.resultValue ?? '').trim() !== '').length;
            const status: ProtocoloProgreso['status'] =
              total === 0 || filled === 0 ? 'sin' : filled === total ? 'completa' : 'parcial';
            return { protocolId, resultIds: results.map(r => r.id), filled, total, status };
          }),
        );
      }),
    );
  }
}
