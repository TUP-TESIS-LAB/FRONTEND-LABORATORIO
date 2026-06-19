import { createFeatureSelector, createSelector } from '@ngrx/store';
import { cantidadUbParaVersion } from '../../models/nomenclador.model';
import { NOMENCLADOR_FEATURE_KEY, NomencladorFeatureState } from './nomenclador.state';

export const selectNomencladorState =
  createFeatureSelector<NomencladorFeatureState>(NOMENCLADOR_FEATURE_KEY);

// ── Slices básicos ────────────────────────────────────────────────────────────

export const selectNbuVersions = createSelector(selectNomencladorState, s => s.nbuVersions);
export const selectSelectedVersionId = createSelector(selectNomencladorState, s => s.selectedVersionId);
export const selectValorUb = createSelector(selectNomencladorState, s => s.particular.valorUb);
export const selectNomencladorPending = createSelector(selectNomencladorState, s => s.pending);

// ── Catálogo con cantidadUb resuelta por versión ──────────────────────────────

/**
 * Filas del catálogo con cantidadUb ajustada al factor de la versión seleccionada.
 * Precondición: selectedVersionId != null (cae al factor 1 si es null).
 */
export const selectCatalogRows = createSelector(
  selectNomencladorState,
  (s) => {
    const versionId = s.selectedVersionId ?? 'v2024';
    return s.catalog.map(r => ({
      ...r,
      cantidadUb: cantidadUbParaVersion(r.cantidadUb, versionId),
    }));
  },
);

// ── Determinaciones (lazy, por analysisId) ────────────────────────────────────

/**
 * Factory — devuelve un selector para las determinaciones de un analysisId.
 * Retorna null mientras no se hayan cargado (distinto de [] = cargado sin datos).
 */
export function selectDeterminations(analysisId: number) {
  return createSelector(
    selectNomencladorState,
    s => s.determinationsByAnalysis[analysisId] ?? null,
  );
}

// ── Precio particular — colección ─────────────────────────────────────────────

/**
 * Colección completa de filas de precio particular.
 *
 * Campos calculados:
 *  - cantidadUb: base ajustada por versión activa.
 *  - auto: cantidadUb × valorUb (null si cantidadUb es null).
 *  - precio: override manual ?? auto.
 *  - esManual: hay override manual para este analysisId.
 */
export const selectParticularRows = createSelector(
  selectNomencladorState,
  (s) => {
    const versionId = s.selectedVersionId ?? 'v2024';
    return s.catalog.map(r => {
      const cant = cantidadUbParaVersion(r.cantidadUb, versionId);
      const override = s.particular.overrides[r.id];
      const auto = cant == null ? null : Math.round(cant * s.particular.valorUb * 100) / 100;
      return {
        id: r.id,
        shortCode: r.shortCode,
        name: r.name,
        familyName: r.familyName,
        nbuCode: r.nbuCode,
        cantidadUb: cant,
        auto,
        precio: override != null ? override : auto,
        esManual: override != null,
      };
    });
  },
);

/**
 * Factory — precio particular de un único análisis.
 * Útil para editores de override individuales.
 *
 * Lógica (en orden):
 *  1. Si hay override manual → override.
 *  2. Si cantidadUb es null o selectedVersionId es null → null.
 *  3. precio = cantidadUbParaVersion(cantidadUb, versionId) × valorUb.
 */
export function selectPrecioParticular(analysisId: number) {
  return createSelector(selectNomencladorState, (s): number | null => {
    const override = s.particular.overrides[analysisId];
    if (override != null) return override;

    const versionId = s.selectedVersionId;
    if (!versionId) return null;

    const fila = s.catalog.find(r => r.id === analysisId);
    if (!fila) return null;

    const ub = cantidadUbParaVersion(fila.cantidadUb, versionId);
    if (ub == null) return null;

    return Math.round(ub * s.particular.valorUb * 100) / 100;
  });
}
