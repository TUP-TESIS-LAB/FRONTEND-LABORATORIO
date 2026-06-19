import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnalysisService } from './analysis.service';
import { NbuVersion, CatalogRow, Determination, ParticularPricing } from '../models/nomenclador.model';

/**
 * Fachada del Nomenclador NBU. Aísla el límite REAL/MOCK:
 *  - REAL hoy: catálogo de análisis y determinaciones (AnalysisService → /api/v1/analitica/analysis).
 *  - MOCK: versiones NBU + cantidad U.B. por versión (PR #97) y precio particular (coverages).
 * Para conectar: reemplazar los cuerpos `of(...)` / el factor por versión por las llamadas reales.
 * Las firmas no cambian.
 */
@Injectable({ providedIn: 'root' })
export class NomencladorService {
  private readonly analysis = inject(AnalysisService);

  // ── MOCK — PR #97: GET /api/v1/analitica/nbu-versions ─────────────────────
  private readonly mockVersions: NbuVersion[] = [
    { id: 'v2024', label: 'NBU 2024 — vigente', vigente: true },
    { id: 'v2021', label: 'NBU 2021', vigente: false },
    { id: 'v2018', label: 'NBU 2018', vigente: false },
  ];
  // factor mock para simular que la cantidad de U.B. cambia entre versiones
  private readonly mockVersionFactor: Record<string, number> = { v2024: 1, v2021: 0.85, v2018: 0.7 };

  // ── MOCK — coverages: valor U.B. particular + overrides por estudio ───────
  private mockPricing: ParticularPricing = { valorUb: 350, overrides: { } };

  /** REAL: análisis del catálogo de hoy mapeados a CatalogRow. */
  getCatalog(): Observable<CatalogRow[]> {
    return this.analysis.list(200).pipe(
      map(list => list.map(a => ({
        id: a.id, shortCode: a.shortCode, name: a.name, familyName: a.familyName,
        nbuCode: null,            // el list no trae nbuCode; se completa al expandir (getDeterminations) con PR #97 vía /catalog
        cantidadUb: a.ubCount,    // real hoy (puede ser null si no configurado)
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

  getVersions(): Observable<NbuVersion[]> {
    return of(this.mockVersions.map(v => ({ ...v }))); // MOCK — PR #97
  }

  /** MOCK — PR #97: la cantidad U.B. correcta saldrá de NbuVersionDetail por (práctica, versión). */
  cantidadUbForVersion(base: number | null, versionId: string): number | null {
    if (base == null) return null;
    const f = this.mockVersionFactor[versionId] ?? 1;
    return Math.round(base * f * 100) / 100;
  }

  getParticularPricing(): Observable<ParticularPricing> {
    return of({ valorUb: this.mockPricing.valorUb, overrides: { ...this.mockPricing.overrides } }); // MOCK — coverages
  }

  saveValorUb(valor: number): Observable<number> {
    this.mockPricing = { ...this.mockPricing, valorUb: valor }; // MOCK — coverages (persiste en sesión)
    return of(valor);
  }

  setOverride(analysisId: number, precio: number | null): Observable<{ analysisId: number; precio: number | null }> {
    const overrides = { ...this.mockPricing.overrides };
    if (precio == null) delete overrides[analysisId]; else overrides[analysisId] = precio;
    this.mockPricing = { ...this.mockPricing, overrides }; // MOCK — coverages
    return of({ analysisId, precio });
  }
}
