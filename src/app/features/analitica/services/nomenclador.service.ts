import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AnalysisService } from './analysis.service';
import { NbuVersion, CatalogRow, Determination, ParticularPricing } from '../models/nomenclador.model';

/** Respuesta REAL de GET /api/v1/analitica/nbu-versions (PR #97 / KAN-115). */
interface NbuVersionResponse {
  id: number;
  versionCode: string;       // "YYYY_YYYY", ej. "2024_2025"
  active: boolean;
  status: string;            // "active" | "future" | "inactive"
}

/**
 * Fachada del Nomenclador NBU. Aísla qué está conectado al backend y qué sigue mock:
 *  - REAL: catálogo de análisis + determinaciones (AnalysisService → /api/v1/analitica/analysis)
 *          y versiones NBU (GET /api/v1/analitica/nbu-versions, PR #97).
 *  - MOCK (sin endpoint en el BE todavía): precio particular del laboratorio (valor U.B. + overrides).
 *    El modelo de "precio particular en config del tenant" es feature futura — ver follow-up.
 */
@Injectable({ providedIn: 'root' })
export class NomencladorService {
  private readonly http = inject(HttpClient);
  private readonly analysis = inject(AnalysisService);

  // ── MOCK — sin endpoint BE: valor U.B. particular + overrides por estudio ─────
  // El BE solo tiene un ParticularPricingPort interno (lee del plan "particular" de OS),
  // no expuesto en REST. Cuando exista el endpoint de precio particular por tenant, conectar acá.
  private mockPricing: ParticularPricing = { valorUb: 350, overrides: { } };

  /** REAL: análisis del catálogo del tenant mapeados a CatalogRow. */
  getCatalog(): Observable<CatalogRow[]> {
    return this.analysis.list(200).pipe(
      map(list => list.map(a => ({
        id: a.id, shortCode: a.shortCode, name: a.name, familyName: a.familyName,
        nbuCode: a.nbuCode ?? null,  // el listado ya trae el código NBU (AnalysisResponse.nbuCode)
        cantidadUb: a.cantidadUb ?? a.ubCount ?? null,  // real (backend manda cantidadUb); null si no configurado
      }))),
    );
  }

  /** REAL: determinaciones y nbuCode del detalle del análisis.
   *  El nbuCode se extrae del detalle y se usa para parchear la fila del catálogo en el store. */
  getDeterminations(analysisId: number): Observable<{ nbuCode: string | null; determinations: Determination[] }> {
    return this.analysis.getById(analysisId).pipe(
      map(detail => ({
        nbuCode: detail.nbuCode,
        determinations: detail.determinations.map(d => ({ id: d.id, name: d.name })),
      })),
    );
  }

  /**
   * REAL: GET /api/v1/analitica/nbu-versions → versiones del nomenclador.
   * Resiliente: ante error (ej. 403 si el endpoint sigue gateado a SAAS_ADMIN, o red) devuelve []
   * para no romper la carga del catálogo (van juntos en un forkJoin en el effect).
   */
  getVersions(): Observable<NbuVersion[]> {
    return this.http.get<NbuVersionResponse[]>('/api/v1/analitica/nbu-versions').pipe(
      map(list => list.map(v => ({
        id: String(v.id),
        label: `NBU ${v.versionCode.replace('_', '/')}` + (v.active ? ' — vigente' : ''),
        vigente: v.active,
      }))),
      catchError(() => of([] as NbuVersion[])),
    );
  }

  /**
   * Cantidad de U.B. de un análisis para la versión seleccionada.
   * Passthrough HOY: el backend devuelve la cantidadUb global de analysis_catalog y todavía NO
   * resuelve la cantidad por versión (nbu_version_details existe pero la búsqueda no lo aplica).
   * Cuando el BE implemente la resolución por versión, reemplazar por la consulta real.
   */
  cantidadUbForVersion(base: number | null, _versionId: string): number | null {
    return base;
  }

  getParticularPricing(): Observable<ParticularPricing> {
    return of({ valorUb: this.mockPricing.valorUb, overrides: { ...this.mockPricing.overrides } }); // MOCK — sin endpoint BE
  }

  saveValorUb(valor: number): Observable<number> {
    this.mockPricing = { ...this.mockPricing, valorUb: valor }; // MOCK — sin endpoint BE (persiste en sesión)
    return of(valor);
  }

  setOverride(analysisId: number, precio: number | null): Observable<{ analysisId: number; precio: number | null }> {
    const overrides = { ...this.mockPricing.overrides };
    if (precio == null) delete overrides[analysisId]; else overrides[analysisId] = precio;
    this.mockPricing = { ...this.mockPricing, overrides }; // MOCK — sin endpoint BE
    return of({ analysisId, precio });
  }
}
